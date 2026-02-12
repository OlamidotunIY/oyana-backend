import { Resolver, Mutation, Args, Context } from '@nestjs/graphql';
import { Response as ExpressResponse } from 'express';
import { AuthService } from './auth.service';
import {
  SignUpInput,
  SignInInput,
  RequestOtpInput,
  VerifyOtpInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  CompleteSignupInput,
} from '../graphql/dto/auth';
import { AuthResponse, MessageResponse } from '../graphql/types/auth';

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
    @Args('refreshToken') refreshToken: string,
    @Context() context: { res: ExpressResponse },
  ): Promise<AuthResponse> {
    return this.authService.refreshToken(refreshToken, context.res);
  }
}
