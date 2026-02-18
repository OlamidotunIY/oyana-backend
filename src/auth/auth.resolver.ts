import { Resolver, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards, UnauthorizedException } from '@nestjs/common';
import { Response as ExpressResponse } from 'express';
import type { User } from '@supabase/supabase-js';
import { AuthService } from './auth.service';
import {
  SignUpInput,
  SignInInput,
  RequestOtpInput,
  VerifyOtpInput,
  RequestPhoneOtpInput,
  VerifyPhoneOtpInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from '../graphql/dto/auth';
import { AuthResponse, MessageResponse } from '../graphql/types/auth';
import { GqlAuthGuard } from './guards/gql-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => MessageResponse)
  async signUp(@Args('input') input: SignUpInput): Promise<MessageResponse> {
    return this.authService.signUp(input);
  }

  @Mutation(() => AuthResponse)
  async signIn(
    @Args('input') input: SignInInput,
    @Context() context: { res: ExpressResponse },
  ): Promise<AuthResponse> {
    return this.authService.signIn(input, context.res);
  }

  @Mutation(() => MessageResponse)
  async requestOtp(
    @Args('input') input: RequestOtpInput,
  ): Promise<MessageResponse> {
    return this.authService.requestOtp(input);
  }

  @Mutation(() => AuthResponse)
  async verifyOtp(
    @Args('input') input: VerifyOtpInput,
    @Context() context: { res: ExpressResponse },
  ): Promise<AuthResponse> {
    return this.authService.verifyOtp(input, context.res);
  }

  @Mutation(() => MessageResponse)
  @UseGuards(GqlAuthGuard)
  async requestPhoneOtp(
    @CurrentUser() user: User,
    @Args('input') input: RequestPhoneOtpInput,
  ): Promise<MessageResponse> {
    return this.authService.requestPhoneOtp(user.id, input);
  }

  @Mutation(() => MessageResponse)
  @UseGuards(GqlAuthGuard)
  async verifyPhoneOtp(
    @CurrentUser() user: User,
    @Args('input') input: VerifyPhoneOtpInput,
  ): Promise<MessageResponse> {
    return this.authService.verifyPhoneOtp(user.id, input);
  }

  @Mutation(() => MessageResponse)
  async forgotPassword(
    @Args('input') input: ForgotPasswordInput,
  ): Promise<MessageResponse> {
    return this.authService.forgotPassword(input);
  }

  @Mutation(() => MessageResponse)
  async resetPassword(
    @Args('input') input: ResetPasswordInput,
    @Context() context: any,
  ): Promise<MessageResponse> {
    const authHeader = context.req?.headers?.authorization;
    if (!authHeader) {
      throw new Error('Authorization header required');
    }
    const token = authHeader.replace('Bearer ', '');
    return this.authService.resetPassword(input, token);
  }

  @Mutation(() => AuthResponse)
  async refreshToken(
    @Args('refreshToken', { nullable: true }) refreshToken: string | null,
    @Context() context: { req?: { cookies?: Record<string, string> }; res: ExpressResponse },
  ): Promise<AuthResponse> {
    const resolvedRefreshToken =
      refreshToken ?? context.req?.cookies?.['oyana-refreshToken'];

    if (!resolvedRefreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    return this.authService.refreshToken(resolvedRefreshToken, context.res);
  }
}
