import { Resolver, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException, UseGuards } from '@nestjs/common';
import { Response as ExpressResponse } from 'express';
import { AuthService } from './auth.service';
import {
  SignInInput,
  SignInWithGoogleInput,
  RequestPhoneOtpInput,
  VerifyPhoneOtpAndAuthenticateInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from '../graphql/dto/auth';
import { AuthResponse, MessageResponse } from '../graphql/types/auth';
import { GqlAuthGuard } from './guards/gql-auth.guard';
import { MobileClientGuard } from './guards/mobile-client.guard';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

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
  async requestPhoneOtp(
    @Args('input') input: RequestPhoneOtpInput,
  ): Promise<MessageResponse> {
    return this.authService.requestPhoneOtp(input);
  }

  @Mutation(() => AuthResponse)
  async verifyPhoneOtpAndAuthenticate(
    @Args('input') input: VerifyPhoneOtpAndAuthenticateInput,
    @Context() context: { req: any; res: ExpressResponse },
  ): Promise<AuthResponse> {
    return this.authService.verifyPhoneOtpAndAuthenticate(
      input,
      context.req,
      context.res,
    );
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
