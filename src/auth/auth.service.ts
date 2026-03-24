// ============================================================================
// AUTH SERVICE — Self-managed JWT auth (replaces Supabase)
// ============================================================================
import {
  BadRequestException,
  Injectable,
  Logger,
  NotImplementedException,
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
      if (!input.businessAddress) {
        throw new BadRequestException(
          'Business address is required for business signup',
        );
      }
    }

    const existing = await this.prisma.runWithRetry(
      'AuthService.signUp.checkEmail',
      () =>
        this.prisma.profile.findUnique({
          where: { email: input.email },
          select: { id: true },
        }),
    );

    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(
      input.password,
      BCRYPT_PASSWORD_ROUNDS,
    );
    const profileId = randomUUID();

    await this.prisma.runWithRetry('AuthService.signUp.createProfile', () =>
      this.prisma.profile.create({
        data: {
          id: profileId,
          email: input.email,
          passwordHash,
          roles,
          firstName: input.firstName,
          lastName: input.lastName,
          state: input.state,
          referralCode: input.referralCode,
          phoneE164: input.phoneNumber,
        },
      }),
    );

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

    return {
      message: 'Account created successfully. You can now sign in.',
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
    const profile = await this.prisma.runWithRetry(
      'AuthService.signIn.findProfile',
      () =>
        this.prisma.profile.findUnique({
          where: { email: input.email },
          select: { id: true, email: true, passwordHash: true },
        }),
    );

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
    const existing = await this.prisma.runWithRetry(
      'AuthService.requestOtp.checkEmail',
      () =>
        this.prisma.profile.findUnique({
          where: { email: input.email },
          select: { id: true },
        }),
    );

    if (input.mode === OtpMode.SIGNUP && existing) {
      throw new BadRequestException('Email already registered');
    }
    if (input.mode === OtpMode.SIGNIN && !existing) {
      throw new BadRequestException('Email not found');
    }

    const code = this.generateOtpCode();
    const codeHash = await bcrypt.hash(code, BCRYPT_OTP_ROUNDS);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await this.prisma.runWithRetry('AuthService.requestOtp.createOtp', () =>
      this.prisma.otpCode.create({
        data: { email: input.email, codeHash, mode: input.mode, expiresAt },
      }),
    );

    await this.mailService.sendOtpEmail(input.email, code);

    return {
      message:
        input.mode === OtpMode.SIGNUP
          ? 'Verification code sent. Please check your email to continue signup.'
          : 'OTP sent to your email',
      success: true,
    };
  }

  async verifyOtp(
    input: VerifyOtpInput,
    req: ExpressRequest,
    response: ExpressResponse,
  ): Promise<AuthResponse> {
    const otpRecord = await this.prisma.runWithRetry(
      'AuthService.verifyOtp.findOtp',
      () =>
        this.prisma.otpCode.findFirst({
          where: {
            email: input.email,
            mode: { in: [OtpMode.SIGNUP, OtpMode.SIGNIN] },
            usedAt: null,
            expiresAt: { gt: new Date() },
          },
          orderBy: { createdAt: 'desc' },
        }),
    );

    if (!otpRecord) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const codeValid = await bcrypt.compare(input.token, otpRecord.codeHash);
    if (!codeValid) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    await this.prisma.runWithRetry('AuthService.verifyOtp.markUsed', () =>
      this.prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { usedAt: new Date() },
      }),
    );

    let profile = await this.userService.getProfileByEmail(input.email);

    if (!profile) {
      const profileId = randomUUID();
      await this.prisma.runWithRetry(
        'AuthService.verifyOtp.createProfile',
        () =>
          this.prisma.profile.create({
            data: { id: profileId, email: input.email, state: 'Lagos' as any },
          }),
      );
      profile = await this.userService.getProfileByEmail(input.email);
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
      await this.prisma.runWithRetry(
        'AuthService.signInWithGoogle.createProfile',
        () =>
          this.prisma.profile.create({
            data: { id: profileId, email, state: 'Lagos' as any },
          }),
      );
      profile = await this.userService.getProfileByEmail(email);
    }

    if (!profile) {
      throw new UnauthorizedException('Profile not found');
    }

    await this.prisma.runWithRetry(
      'AuthService.signInWithGoogle.upsertSocial',
      () =>
        this.prisma.socialAccount.upsert({
          where: { provider_providerId: { provider: 'google', providerId } },
          create: {
            profileId: profile!.id,
            provider: 'google',
            providerId,
            email,
          },
          update: { email },
        }),
    );

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
    const profile = await this.prisma.runWithRetry(
      'AuthService.forgotPassword.findProfile',
      () =>
        this.prisma.profile.findUnique({
          where: { email: input.email },
          select: { id: true },
        }),
    );

    if (!profile) {
      // Don't reveal whether the email exists
      return {
        message: 'If that email is registered, a reset code has been sent.',
        success: true,
      };
    }

    const code = this.generateOtpCode();
    const codeHash = await bcrypt.hash(code, BCRYPT_OTP_ROUNDS);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await this.prisma.runWithRetry('AuthService.forgotPassword.createOtp', () =>
      this.prisma.otpCode.create({
        data: {
          email: input.email,
          codeHash,
          mode: 'password_reset',
          expiresAt,
        },
      }),
    );

    await this.mailService.sendPasswordResetEmail(input.email, code);

    return {
      message: 'If that email is registered, a reset code has been sent.',
      success: true,
    };
  }

  async resetPassword(input: ResetPasswordInput): Promise<MessageResponse> {
    const otpRecord = await this.prisma.runWithRetry(
      'AuthService.resetPassword.findOtp',
      () =>
        this.prisma.otpCode.findFirst({
          where: {
            email: input.email,
            mode: 'password_reset',
            usedAt: null,
            expiresAt: { gt: new Date() },
          },
          orderBy: { createdAt: 'desc' },
        }),
    );

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

    const session = await this.prisma.runWithRetry(
      'AuthService.rotateSession.findSession',
      () =>
        this.prisma.userSession.findUnique({
          where: { refreshTokenHash: tokenHash },
          include: { profile: { select: { id: true, email: true } } },
        }),
    );

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    // Delete old session (rotation — prevents replay)
    await this.prisma.runWithRetry('AuthService.rotateSession.deleteOld', () =>
      this.prisma.userSession.delete({ where: { id: session.id } }),
    );

    await this.issueTokens(
      session.profile.id,
      session.profile.email,
      req,
      response,
    );

    return { id: session.profile.id, email: session.profile.email };
  }

  // ---------------------------------------------------------------------------
  // Phone OTP — stubs (not yet supported)
  // ---------------------------------------------------------------------------

  async requestPhoneOtp(
    _profileId: string,
    _input: RequestPhoneOtpInput,
  ): Promise<MessageResponse> {
    throw new NotImplementedException('Phone OTP is not yet supported');
  }

  async verifyPhoneOtp(
    _profileId: string,
    _input: VerifyPhoneOtpInput,
  ): Promise<MessageResponse> {
    throw new NotImplementedException('Phone OTP is not yet supported');
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
      await this.prisma
        .runWithRetry('AuthService.logout.deleteSession', () =>
          this.prisma.userSession.deleteMany({
            where: { refreshTokenHash: tokenHash },
          }),
        )
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

    await this.prisma.runWithRetry(
      'AuthService.issueTokens.createSession',
      () =>
        this.prisma.userSession.create({
          data: { profileId, refreshTokenHash, userAgent, ip, expiresAt },
        }),
    );

    this.setCookies(response, accessToken, refreshToken);

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private generateOtpCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async updateLastLogin(profileId: string): Promise<void> {
    await this.prisma
      .runWithRetry('AuthService.updateLastLogin', () =>
        this.prisma.profile.update({
          where: { id: profileId },
          data: { lastLoginAt: new Date() },
        }),
      )
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
