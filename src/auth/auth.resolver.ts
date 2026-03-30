import { Resolver, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards, UnauthorizedException } from '@nestjs/common';
import { Response as ExpressResponse } from 'express';
import { AuthService } from './auth.service';
import {
  SignUpDriverInput,
  SignUpShipperInput,
  SignInInput,
  SignInWithGoogleInput,
  RequestOtpInput,
  VerifyOtpInput,
  RequestPhoneOtpInput,
  VerifyPhoneOtpInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from '../graphql/dto/auth';
import { AuthResponse, MessageResponse } from '../graphql/types/auth';
import { GqlAuthGuard } from './guards/gql-auth.guard';
import { MobileClientGuard } from './guards/mobile-client.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthUser } from './auth.types';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => MessageResponse)
  async signUpShipper(
    @Args('input') input: SignUpShipperInput,
  ): Promise<MessageResponse> {
    return this.authService.signUpShipper(input);
  }

  @Mutation(() => MessageResponse)
  async signUpDriver(
    @Args('input') input: SignUpDriverInput,
  ): Promise<MessageResponse> {
    return this.authService.signUpDriver(input);
  }

  @Mutation(() => AuthResponse)
  async signIn(
    @Args('input') input: SignInInput,
    @Context() context: { req: any; res: ExpressResponse },
  ): Promise<AuthResponse> {
    return this.authService.signIn(input, context.req, context.res);
  }

  @Mutation(() => AuthResponse)
  @UseGuards(MobileClientGuard)
  async signInWithGoogle(
    @Args('input') input: SignInWithGoogleInput,
    @Context() context: { req: any; res: ExpressResponse },
  ): Promise<AuthResponse> {
    return this.authService.signInWithGoogle(input, context.req, context.res);
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
    @Context() context: { req: any; res: ExpressResponse },
  ): Promise<AuthResponse> {
    return this.authService.verifyOtp(input, context.req, context.res);
  }

  @Mutation(() => MessageResponse)
  @UseGuards(GqlAuthGuard)
  async requestPhoneOtp(
    @CurrentUser() user: AuthUser,
    @Args('input') input: RequestPhoneOtpInput,
  ): Promise<MessageResponse> {
    return this.authService.requestPhoneOtp(user.id, input);
  }

  @Mutation(() => MessageResponse)
  @UseGuards(GqlAuthGuard)
  async verifyPhoneOtp(
    @CurrentUser() user: AuthUser,
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
  ): Promise<MessageResponse> {
    return this.authService.resetPassword(input);
  }

  @Mutation(() => AuthResponse)
  async refreshToken(
    @Args('refreshToken', { type: () => String, nullable: true })
    refreshToken: string | null,
    @Context()
    context: {
      req: any;
      res: ExpressResponse;
    },
  ): Promise<AuthResponse> {
    const resolvedRefreshToken =
      refreshToken ?? context.req?.cookies?.['oyana-refreshToken'];

    if (!resolvedRefreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    return this.authService.refreshToken(
      resolvedRefreshToken,
      context.req,
      context.res,
    );
  }

  @Mutation(() => MessageResponse)
  async logout(
    @Context() context: { req: any; res: ExpressResponse },
  ): Promise<MessageResponse> {
    const refreshToken = context.req?.cookies?.['oyana-refreshToken'];
    return this.authService.logout(refreshToken, context.res);
  }
}
