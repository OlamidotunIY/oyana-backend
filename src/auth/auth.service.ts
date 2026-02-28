import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SupabaseService } from '../auth/supabase/supabase.service';
import { ConfigService } from '@nestjs/config';
import {
  SignUpInput,
  SignInInput,
  RequestOtpInput,
  VerifyOtpInput,
  RequestPhoneOtpInput,
  VerifyPhoneOtpInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  OtpMode,
  UserType,
} from '../graphql/dto/auth';
import { AuthResponse, MessageResponse } from '../graphql/types/auth';
import { PrismaService } from '../database/prisma.service';
import { UserSignedUpEvent } from './events/user-signed-up.event';
import { UserService } from '../user/user.service';
import { Response as ExpressResponse } from 'express';
import type { SupabaseUser } from './supabase/supabase.types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly userService: UserService,
    private readonly prisma: PrismaService,
  ) {}

  async signUp(input: SignUpInput): Promise<MessageResponse> {
    const supabase = this.supabaseService.getClient();
    const roles = this.normalizeSignUpRoles(input.roles);
    const isBusinessSignup = roles.includes(UserType.BUSINESS);

    // Validate business-specific fields
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

    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!data.user) {
      throw new BadRequestException('Failed to create user');
    }

    // Emit user signed up event
    const signupEvent = new UserSignedUpEvent(
      data.user.id,
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
      message:
        'Signup successful. Please check your email to verify your account.',
      success: true,
    };
  }

  private normalizeSignUpRoles(inputRoles?: UserType[] | null): UserType[] {
    const requestedRoles =
      inputRoles && inputRoles.length > 0
        ? inputRoles
        : [UserType.INDIVIDUAL];

    if (requestedRoles.includes(UserType.ADMIN)) {
      throw new BadRequestException('Admin role cannot be self-assigned');
    }

    const normalizedRoles = Array.from(new Set(requestedRoles));

    if (normalizedRoles.includes(UserType.BUSINESS)) {
      normalizedRoles.push(UserType.INDIVIDUAL);
    }

    return Array.from(new Set(normalizedRoles));
  }

  async signIn(
    input: SignInInput,
    response: ExpressResponse,
  ): Promise<AuthResponse> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error) {
      throw new UnauthorizedException(error.message);
    }

    if (!data.session || !data.user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const profile = await this.userService.getProfileByEmail(data.user.email!);

    if (!profile) {
      throw new UnauthorizedException('Profile not found');
    }

    this.setCookies(
      response,
      data.session.access_token,
      data.session.refresh_token,
    );

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: profile,
    };
  }

  async requestOtp(input: RequestOtpInput): Promise<MessageResponse> {
    const supabase = this.supabaseService.getClient();

    // Check if email exists in auth.users
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const userExists = existingUsers?.users?.some(
      (user: SupabaseUser) => user.email === input.email,
    );

    if (input.mode === OtpMode.SIGNUP && userExists) {
      throw new BadRequestException('Email already registered');
    }

    if (input.mode === OtpMode.SIGNIN && !userExists) {
      throw new BadRequestException('Email not found');
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: input.email,
      options: {
        shouldCreateUser: input.mode === OtpMode.SIGNUP,
      },
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return {
      message:
        input.mode === OtpMode.SIGNUP
          ? 'Verification code sent. Please verify your email to continue signup.'
          : 'OTP sent to your email',
      success: true,
    };
  }

  async verifyOtp(
    input: VerifyOtpInput,
    response: ExpressResponse,
  ): Promise<AuthResponse> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.auth.verifyOtp({
      email: input.email,
      token: input.token,
      type: 'email',
    });

    if (error) {
      throw new UnauthorizedException(error.message);
    }

    if (!data.session || !data.user) {
      throw new UnauthorizedException('Invalid OTP');
    }

    const profile = await this.userService.getProfileByEmail(data.user.email!);

    if (!profile) {
      throw new UnauthorizedException('Profile not found');
    }

    this.setCookies(
      response,
      data.session.access_token,
      data.session.refresh_token,
    );

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: profile,
    };
  }

  async forgotPassword(input: ForgotPasswordInput): Promise<MessageResponse> {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase.auth.resetPasswordForEmail(input.email);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return {
      message: 'Password reset email sent',
      success: true,
    };
  }

  async resetPassword(
    input: ResetPasswordInput,
    accessToken: string,
  ): Promise<MessageResponse> {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase.auth.updateUser({
      password: input.newPassword,
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return {
      message: 'Password updated successfully',
      success: true,
    };
  }

  async refreshToken(
    refreshToken: string,
    response: ExpressResponse,
  ): Promise<AuthResponse> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const profile = await this.userService.getProfileByEmail(data.user!.email!);

    if (!profile) {
      throw new UnauthorizedException('Profile not found');
    }

    this.setCookies(
      response,
      data.session.access_token,
      data.session.refresh_token,
    );

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: profile,
    };
  }

  async requestPhoneOtp(
    profileId: string,
    input: RequestPhoneOtpInput,
  ): Promise<MessageResponse> {
    const profile = await this.prisma.runWithRetry(
      'AuthService.requestPhoneOtp.profile',
      () =>
        this.prisma.profile.findUnique({
          where: { id: profileId },
          select: {
            id: true,
          },
        }),
    );

    if (!profile) {
      throw new UnauthorizedException('Profile not found');
    }

    const supabase = this.supabaseService.getClient();
    const { error } = await supabase.auth.signInWithOtp({
      phone: input.phoneE164,
      options: {
        shouldCreateUser: false,
      },
    });

    if (error) {
      await this.recordPhoneVerificationAttempt(
        profileId,
        input.phoneE164,
        'failed',
        { stage: 'request', message: error.message },
      );
      throw new BadRequestException(error.message);
    }

    await this.recordPhoneVerificationAttempt(
      profileId,
      input.phoneE164,
      'requested',
      { stage: 'request' },
    );

    return {
      message: 'OTP sent to your phone number',
      success: true,
    };
  }

  async verifyPhoneOtp(
    profileId: string,
    input: VerifyPhoneOtpInput,
  ): Promise<MessageResponse> {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase.auth.verifyOtp({
      phone: input.phoneE164,
      token: input.token,
      type: 'sms',
    });

    if (error || !data.user) {
      await this.recordPhoneVerificationAttempt(
        profileId,
        input.phoneE164,
        'failed',
        { stage: 'verify', message: error?.message ?? 'Invalid OTP' },
      );
      throw new UnauthorizedException(error?.message ?? 'Invalid OTP');
    }

    await this.prisma.runWithRetry(
      'AuthService.verifyPhoneOtp.updateProfile',
      () =>
        this.prisma.profile.update({
          where: { id: profileId },
          data: {
            phoneE164: input.phoneE164,
            phoneVerified: true,
            phoneVerifiedAt: new Date(),
          },
        }),
    );

    await this.recordPhoneVerificationAttempt(
      profileId,
      input.phoneE164,
      'verified',
      { stage: 'verify' },
    );

    return {
      message: 'Phone number verified successfully',
      success: true,
    };
  }

  private async recordPhoneVerificationAttempt(
    profileId: string,
    phoneE164: string,
    status: 'requested' | 'verified' | 'failed',
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.prisma.runWithRetry(
        'AuthService.recordPhoneVerificationAttempt',
        () =>
          this.prisma.phoneVerificationAttempt.create({
            data: {
              profileId,
              phoneE164,
              provider: 'supabase',
              status,
              metadata: metadata as Prisma.InputJsonValue | undefined,
            },
          }),
      );
    } catch (error) {
      this.logger.warn(
        `Failed to write phone verification attempt for profile ${profileId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async logout(response: ExpressResponse): Promise<MessageResponse> {
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

    return { message: 'Logged out successfully', success: true };
  }

  private setCookies(
    response: ExpressResponse,
    accessToken: string,
    refreshToken: string,
  ): void {
    if (!response || response.headersSent || response.writableEnded) {
      this.logger.warn(
        'Skipping auth cookie set because headers are already sent or response is closed.',
      );
      return;
    }

    const isProduction = this.configService.get('NODE_ENV') === 'production';

    response.cookie('oyana-accessToken', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 7776000000, // 90 days
    });

    response.cookie('oyana-refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 31536000000, // 1 year
    });
  }
}
