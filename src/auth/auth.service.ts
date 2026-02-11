import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../auth/supabase/supabase.service';
import { ConfigService } from '@nestjs/config';
import {
  SignUpInput,
  SignInInput,
  RequestOtpInput,
  VerifyOtpInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  CompleteSignupInput,
  OtpMode,
} from '../graphql/dto/auth';
import { AuthResponse, MessageResponse } from '../graphql/types/auth';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async signUp(input: SignUpInput): Promise<AuthResponse> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          full_name: input.fullName,
          signup_role: 'customer',
        },
      },
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!data.session || !data.user) {
      // Email confirmation required
      return {
        accessToken: '',
        refreshToken: '',
        expiresIn: 0,
        tokenType: 'bearer',
        user: {
          id: data.user?.id || '',
          email: input.email,
          fullName: input.fullName,
          emailConfirmed: false,
        },
      };
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in || 3600,
      tokenType: 'bearer',
      user: {
        id: data.user.id,
        email: data.user.email!,
        fullName: data.user.user_metadata?.full_name || input.fullName,
        emailConfirmed: !!data.user.email_confirmed_at,
      },
    };
  }

  async signIn(input: SignInInput): Promise<AuthResponse> {
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

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in || 3600,
      tokenType: 'bearer',
      user: {
        id: data.user.id,
        email: data.user.email!,
        fullName: data.user.user_metadata?.full_name,
        emailConfirmed: !!data.user.email_confirmed_at,
      },
    };
  }

  async requestOtp(input: RequestOtpInput): Promise<MessageResponse> {
    const supabase = this.supabaseService.getClient();

    // Check if email exists in auth.users
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const userExists = existingUsers?.users?.some(
      (user) => user.email === input.email,
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

  async verifyOtp(input: VerifyOtpInput): Promise<AuthResponse> {
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

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in || 3600,
      tokenType: 'bearer',
      user: {
        id: data.user.id,
        email: data.user.email!,
        fullName: data.user.user_metadata?.full_name,
        emailConfirmed: !!data.user.email_confirmed_at,
      },
    };
  }

  async completeSignup(
    input: CompleteSignupInput,
    accessToken: string,
  ): Promise<AuthResponse> {
    const supabase = this.supabaseService.getClient();

    // Get the current user from the access token
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      throw new UnauthorizedException('Invalid access token');
    }

    // Update password in Supabase Auth
    const { error: passwordError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        password: input.password,
        user_metadata: {
          full_name: input.fullName,
        },
      },
    );

    if (passwordError) {
      throw new BadRequestException(
        `Failed to set password: ${passwordError.message}`,
      );
    }

    // Upsert profile in database
    await this.prisma.profile.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        fullName: input.fullName,
        phoneE164: input.phoneE164,
        displayName: input.fullName,
      },
      update: {
        fullName: input.fullName,
        phoneE164: input.phoneE164,
        displayName: input.fullName,
      },
    });

    // Get updated session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.refreshSession({
      refresh_token: accessToken,
    });

    if (sessionError || !session) {
      throw new UnauthorizedException('Failed to refresh session');
    }

    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresIn: session.expires_in || 3600,
      tokenType: 'bearer',
      user: {
        id: user.id,
        email: user.email!,
        fullName: input.fullName,
        emailConfirmed: !!user.email_confirmed_at,
      },
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

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in || 3600,
      tokenType: 'bearer',
      user: {
        id: data.user!.id,
        email: data.user!.email!,
        fullName: data.user!.user_metadata?.full_name,
        emailConfirmed: !!data.user!.email_confirmed_at,
      },
    };
  }
}
