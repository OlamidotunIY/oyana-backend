// ============================================================================
// AUTH SERVICE — Self-managed JWT auth
// ============================================================================
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createHash, randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';

import { PrismaService } from '../database/prisma.service';
import { UserService } from '../user/user.service';
import { UserSignedUpEvent } from './events/user-signed-up.event';
import { MailService } from './mail.service';
import { SmsService } from './sms.service';
import type { AuthUser } from './auth.types';
import {
  ForgotPasswordInput,
  OtpMode,
  RequestOtpInput,
  RequestPhoneOtpInput,
  ResetPasswordInput,
  SignInInput,
  SignUpInput,
  UserType,
  VerifyOtpInput,
  VerifyPhoneOtpInput,
} from '../graphql/dto/auth';
import type { SignInWithGoogleInput } from '../graphql/dto/auth/sign-in-with-google.dto';
import { AuthResponse, MessageResponse } from '../graphql/types/auth';

const BCRYPT_PASSWORD_ROUNDS = 12;
const BCRYPT_OTP_ROUNDS = 10;
const OTP_TTL_MINUTES = 10;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const OTP_MODE = {
  SIGNUP: 'signup',
  SIGNIN: 'signin',
  EMAIL_VERIFICATION: 'email_verification',
  PASSWORD_RESET: 'password_reset',
  PHONE_VERIFICATION: 'phone_verification',
} as const;

type OtpModeValue = (typeof OTP_MODE)[keyof typeof OTP_MODE];

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly oauthClient: OAuth2Client;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly userService: UserService,
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly smsService: SmsService,
  ) {
    this.oauthClient = new OAuth2Client(
      configService.get<string>('GOOGLE_CLIENT_ID'),
    );
  }

  // ---------------------------------------------------------------------------
  // Sign up (password-based)
  // ---------------------------------------------------------------------------

  async signUp(input: SignUpInput): Promise<MessageResponse> {
    const roles = this.normalizeSignUpRoles(input.roles);
    const isBusinessSignup = roles.includes(UserType.BUSINESS);

    if (isBusinessSignup) {
      if (!input.phoneNumber) {
        throw new BadRequestException(
          'Phone number is required for business signup',
        );
      }
      if (!input.businessName) {
        throw new BadRequestException(
          'Business name is required for business signup',
        );
      }
    }

    const existing = await this.prisma.profile.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(
      input.password,
      BCRYPT_PASSWORD_ROUNDS,
    );
    const profileId = randomUUID();

    await this.prisma.profile.create({
      data: {
        id: profileId,
        email: input.email,
        emailVerified: false,
        passwordHash,
        roles,
        firstName: input.firstName,
        lastName: input.lastName,
        state: input.state,
        referralCode: input.referralCode,
        phoneE164: input.phoneNumber,
      },
    });

    const signupEvent = new UserSignedUpEvent(
      profileId,
      input.email,
      roles,
      input.firstName,
      input.lastName,
      input.state,
      input.referralCode,
      input.phoneNumber,
      input.businessName,
      input.businessAddress,
    );

    this.eventEmitter.emit('user.signed-up', signupEvent);

    await this.sendEmailOtp(input.email, OTP_MODE.EMAIL_VERIFICATION);

    return {
      message:
        'Account created successfully. Check your email for a verification code before signing in.',
      success: true,
    };
  }

  // ---------------------------------------------------------------------------
  // Sign in (password-based)
  // ---------------------------------------------------------------------------

  async signIn(
    input: SignInInput,
    req: ExpressRequest,
    response: ExpressResponse,
  ): Promise<AuthResponse> {
    const profile = await this.prisma.profile.findUnique({
      where: { email: input.email },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        passwordHash: true,
      },
    });

    if (!profile || !profile.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(
      input.password,
      profile.passwordHash,
    );
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!profile.emailVerified) {
      await this.sendEmailOtp(profile.email, OTP_MODE.EMAIL_VERIFICATION);
      throw new ForbiddenException(
        'Email not verified. We sent a verification code to your email.',
      );
    }

    const fullProfile = await this.userService.getProfileByEmail(input.email);
    if (!fullProfile) {
      throw new UnauthorizedException('Profile not found');
    }

    const { accessToken, refreshToken } = await this.issueTokens(
      profile.id,
      profile.email,
      req,
      response,
    );

    await this.updateLastLogin(profile.id);

    return { accessToken, refreshToken, user: fullProfile };
  }

  // ---------------------------------------------------------------------------
  // OTP (email-based)
  // ---------------------------------------------------------------------------

  async requestOtp(input: RequestOtpInput): Promise<MessageResponse> {
    const normalizedMode = this.normalizeOtpMode(input.mode);

    if (
      normalizedMode !== OTP_MODE.SIGNUP &&
      normalizedMode !== OTP_MODE.SIGNIN &&
      normalizedMode !== OTP_MODE.EMAIL_VERIFICATION
    ) {
      throw new BadRequestException('Unsupported OTP mode');
    }

    const existing = await this.prisma.profile.findUnique({
      where: { email: input.email },
      select: { id: true, emailVerified: true },
    });

    if (normalizedMode === OTP_MODE.SIGNUP && existing?.emailVerified) {
      throw new BadRequestException('Email already registered');
    }

    if (normalizedMode === OTP_MODE.SIGNIN && !existing) {
      throw new BadRequestException('Email not found');
    }

    if (normalizedMode === OTP_MODE.EMAIL_VERIFICATION && !existing) {
      throw new BadRequestException('Email not found');
    }

    await this.sendEmailOtp(input.email, normalizedMode);

    return {
      message: 'Verification code sent. Please check your email.',
      success: true,
    };
  }

  async verifyOtp(
    input: VerifyOtpInput,
    req: ExpressRequest,
    response: ExpressResponse,
  ): Promise<AuthResponse> {
    const otpRecord = await this.prisma.otpCode.findFirst({
      where: {
        email: input.email,
        mode: {
          in: [OTP_MODE.SIGNUP, OTP_MODE.SIGNIN, OTP_MODE.EMAIL_VERIFICATION],
        },
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const codeValid = await bcrypt.compare(input.token, otpRecord.codeHash);
    if (!codeValid) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    await this.prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { usedAt: new Date() },
    });

    let profile = await this.userService.getProfileByEmail(input.email);

    if (!profile) {
      const profileId = randomUUID();
      await this.prisma.profile.create({
        data: {
          id: profileId,
          email: input.email,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          state: 'Lagos' as any,
        },
      });
      profile = await this.userService.getProfileByEmail(input.email);
    } else if (!profile.emailVerified) {
      await this.prisma.profile.update({
        where: { id: profile.id },
        data: {
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });
      profile = await this.userService.findProfileById(profile.id);
    }

    if (!profile) {
      throw new UnauthorizedException('Profile not found');
    }

    const { accessToken, refreshToken } = await this.issueTokens(
      profile.id,
      profile.email,
      req,
      response,
    );

    await this.updateLastLogin(profile.id);

    return { accessToken, refreshToken, user: profile };
  }

  // ---------------------------------------------------------------------------
  // Google OAuth — mobile sends ID token, backend verifies
  // ---------------------------------------------------------------------------

  async signInWithGoogle(
    input: SignInWithGoogleInput,
    req: ExpressRequest,
    response: ExpressResponse,
  ): Promise<AuthResponse> {
    const googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID');

    let payload: { sub?: string; email?: string } | undefined;
    try {
      const ticket = await this.oauthClient.verifyIdToken({
        idToken: input.idToken,
        audience: googleClientId,
      });
      payload = ticket.getPayload() as any;
    } catch {
      throw new UnauthorizedException('Invalid Google ID token');
    }

    if (!payload?.sub || !payload?.email) {
      throw new UnauthorizedException('Invalid Google token payload');
    }

    const { sub: providerId, email } = payload;

    let profile = await this.userService.getProfileByEmail(email);

    if (!profile) {
      const profileId = randomUUID();
      await this.prisma.profile.create({
        data: {
          id: profileId,
          email,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          state: 'Lagos' as any,
        },
      });
      profile = await this.userService.getProfileByEmail(email);
    }

    if (profile && !profile.emailVerified) {
      await this.prisma.profile.update({
        where: { id: profile.id },
        data: {
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });
      profile = await this.userService.findProfileById(profile.id);
    }

    if (!profile) {
      throw new UnauthorizedException('Profile not found');
    }

    await this.prisma.socialAccount.upsert({
      where: { provider_providerId: { provider: 'google', providerId } },
      create: {
        profileId: profile!.id,
        provider: 'google',
        providerId,
        email,
      },
      update: { email },
    });

    const { accessToken, refreshToken } = await this.issueTokens(
      profile.id,
      profile.email,
      req,
      response,
    );

    await this.updateLastLogin(profile.id);

    return { accessToken, refreshToken, user: profile };
  }

  // ---------------------------------------------------------------------------
  // Forgot / Reset password (OTP-based)
  // ---------------------------------------------------------------------------

  async forgotPassword(input: ForgotPasswordInput): Promise<MessageResponse> {
    const profile = await this.prisma.profile.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    if (!profile) {
      // Don't reveal whether the email exists
      return {
        message: 'If that email is registered, a reset code has been sent.',
        success: true,
      };
    }

    await this.sendEmailOtp(input.email, OTP_MODE.PASSWORD_RESET);

    return {
      message: 'If that email is registered, a reset code has been sent.',
      success: true,
    };
  }

  async resetPassword(input: ResetPasswordInput): Promise<MessageResponse> {
    const otpRecord = await this.prisma.otpCode.findFirst({
      where: {
        email: input.email,
        mode: OTP_MODE.PASSWORD_RESET,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    const codeValid = await bcrypt.compare(input.token, otpRecord.codeHash);
    if (!codeValid) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    const passwordHash = await bcrypt.hash(
      input.newPassword,
      BCRYPT_PASSWORD_ROUNDS,
    );

    await this.prisma.$transaction([
      this.prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.profile.update({
        where: { email: input.email },
        data: { passwordHash },
      }),
      this.prisma.userSession.deleteMany({
        where: { profile: { email: input.email } },
      }),
    ]);

    return { message: 'Password updated successfully', success: true };
  }

  // ---------------------------------------------------------------------------
  // Token refresh & session rotation
  // ---------------------------------------------------------------------------

  async refreshToken(
    refreshToken: string,
    req: ExpressRequest,
    response: ExpressResponse,
  ): Promise<AuthResponse> {
    const authUser = await this.rotateSession(refreshToken, req, response);

    if (!authUser) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const fullProfile = await this.userService.getProfileByEmail(
      authUser.email,
    );
    if (!fullProfile) {
      throw new UnauthorizedException('Profile not found');
    }

    const newAccessToken = this.jwtService.sign(
      { sub: authUser.id, email: authUser.email },
      { expiresIn: this.configService.get('JWT_EXPIRATION', '15m') as any },
    );

    return { accessToken: newAccessToken, refreshToken, user: fullProfile };
  }

  /**
   * Validates a refresh token, rotates the session, and sets new cookies.
   * Used by GqlAuthGuard to silently refresh expired access tokens.
   */
  async rotateSession(
    refreshToken: string,
    req: ExpressRequest,
    response: ExpressResponse,
  ): Promise<AuthUser | null> {
    const tokenHash = this.hashToken(refreshToken);

    const session = await this.prisma.userSession.findUnique({
      where: { refreshTokenHash: tokenHash },
      include: { profile: { select: { id: true, email: true } } },
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    // Delete old session (rotation — prevents replay)
    await this.prisma.userSession.delete({ where: { id: session.id } });

    await this.issueTokens(
      session.profile.id,
      session.profile.email,
      req,
      response,
    );

    return { id: session.profile.id, email: session.profile.email };
  }

  async requestPhoneOtp(
    profileId: string,
    input: RequestPhoneOtpInput,
  ): Promise<MessageResponse> {
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      select: { id: true },
    });

    if (!profile) {
      throw new UnauthorizedException('Profile not found');
    }

    const existingPhoneOwner = await this.prisma.profile.findFirst({
      where: {
        phoneE164: input.phoneE164,
        id: { not: profileId },
      },
      select: { id: true },
    });

    if (existingPhoneOwner) {
      throw new BadRequestException('Phone number is already in use');
    }

    const code = await this.createOtpRecord({
      phoneE164: input.phoneE164,
      mode: OTP_MODE.PHONE_VERIFICATION,
    });

    await this.smsService.sendOtpSms(input.phoneE164, code);

    return {
      message: 'Verification code sent to your phone number.',
      success: true,
    };
  }

  async verifyPhoneOtp(
    profileId: string,
    input: VerifyPhoneOtpInput,
  ): Promise<MessageResponse> {
    const otpRecord = await this.prisma.otpCode.findFirst({
      where: {
        phoneE164: input.phoneE164,
        mode: OTP_MODE.PHONE_VERIFICATION,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const codeValid = await bcrypt.compare(input.token, otpRecord.codeHash);
    if (!codeValid) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    await this.prisma.$transaction([
      this.prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.profile.update({
        where: { id: profileId },
        data: {
          phoneE164: input.phoneE164,
          phoneVerified: true,
          phoneVerifiedAt: new Date(),
        },
      }),
    ]);

    return {
      message: 'Phone number verified successfully.',
      success: true,
    };
  }

  // ---------------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------------

  async logout(
    refreshToken: string | undefined,
    response: ExpressResponse,
  ): Promise<MessageResponse> {
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await this.prisma.userSession
        .deleteMany({
          where: { refreshTokenHash: tokenHash },
        })
        .catch((err) => {
          this.logger.warn(
            `Failed to delete session on logout: ${err instanceof Error ? err.message : String(err)}`,
          );
        });
    }

    this.clearCookies(response);

    return { message: 'Logged out successfully', success: true };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async issueTokens(
    profileId: string,
    email: string,
    req: ExpressRequest,
    response: ExpressResponse,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = this.jwtService.sign(
      { sub: profileId, email },
      { expiresIn: this.configService.get('JWT_EXPIRATION', '15m') as any },
    );

    const refreshToken = randomUUID();
    const refreshTokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    const userAgent = req?.headers?.['user-agent'] ?? undefined;
    const ip =
      (req?.headers?.['x-forwarded-for'] as string | undefined)
        ?.split(',')[0]
        ?.trim() ??
      req?.socket?.remoteAddress ??
      undefined;

    await this.prisma.userSession.create({
      data: { profileId, refreshTokenHash, userAgent, ip, expiresAt },
    });

    this.setCookies(response, accessToken, refreshToken);

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private normalizeOtpMode(mode: string): OtpModeValue | null {
    const normalized = mode.trim().toLowerCase();

    switch (normalized) {
      case 'signup':
      case 'sign_up':
      case 'register':
      case 'registration':
        return OTP_MODE.SIGNUP;
      case 'signin':
      case 'sign_in':
      case 'login':
        return OTP_MODE.SIGNIN;
      case 'email_verification':
      case 'verify_email':
        return OTP_MODE.EMAIL_VERIFICATION;
      case 'password_reset':
      case 'forgot_password':
        return OTP_MODE.PASSWORD_RESET;
      case 'phone_verification':
      case 'verify_phone':
        return OTP_MODE.PHONE_VERIFICATION;
      default:
        return null;
    }
  }

  private async createOtpRecord(input: {
    email?: string;
    phoneE164?: string;
    mode: OtpModeValue;
  }): Promise<string> {
    const code = this.generateOtpCode();
    const codeHash = await bcrypt.hash(code, BCRYPT_OTP_ROUNDS);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await this.prisma.otpCode.create({
      data: {
        email: input.email ?? null,
        phoneE164: input.phoneE164 ?? null,
        codeHash,
        mode: input.mode,
        expiresAt,
      },
    });

    return code;
  }

  private async sendEmailOtp(email: string, mode: OtpModeValue): Promise<void> {
    const code = await this.createOtpRecord({ email, mode });

    if (mode === OTP_MODE.PASSWORD_RESET) {
      await this.mailService.sendPasswordResetEmail(email, code);
      return;
    }

    await this.mailService.sendOtpEmail(email, code);
  }

  private generateOtpCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async updateLastLogin(profileId: string): Promise<void> {
    await this.prisma.profile
      .update({
        where: { id: profileId },
        data: { lastLoginAt: new Date() },
      })
      .catch((err) => {
        this.logger.warn(
          `Failed to update lastLoginAt for ${profileId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
  }

  setCookies(
    response: ExpressResponse,
    accessToken: string,
    refreshToken: string,
  ): void {
    if (
      !response ||
      (response as any).headersSent ||
      (response as any).writableEnded
    ) {
      this.logger.warn(
        'Skipping auth cookie set because headers are already sent.',
      );
      return;
    }

    const isProduction = this.configService.get('NODE_ENV') === 'production';

    response.cookie('oyana-accessToken', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_TTL_MS,
    });

    response.cookie('oyana-refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_TTL_MS,
    });
  }

  clearCookies(response: ExpressResponse): void {
    response.cookie('oyana-accessToken', '', {
      httpOnly: true,
      path: '/',
      maxAge: 0,
      sameSite: 'lax',
    });
    response.cookie('oyana-refreshToken', '', {
      httpOnly: true,
      path: '/',
      maxAge: 0,
      sameSite: 'lax',
    });
  }

  private normalizeSignUpRoles(inputRoles?: UserType[] | null): UserType[] {
    const requestedRoles =
      inputRoles && inputRoles.length > 0 ? inputRoles : [UserType.INDIVIDUAL];

    if (requestedRoles.includes(UserType.ADMIN)) {
      throw new BadRequestException('Admin role cannot be self-assigned');
    }

    const normalizedRoles = Array.from(new Set(requestedRoles));

    if (normalizedRoles.includes(UserType.BUSINESS)) {
      normalizedRoles.push(UserType.INDIVIDUAL);
    }

    return Array.from(new Set(normalizedRoles));
  }
}
