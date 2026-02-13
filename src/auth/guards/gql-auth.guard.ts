import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { User } from '@supabase/supabase-js';
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { SupabaseService } from '../supabase/supabase.service';

type RequestWithUser = ExpressRequest & {
  user?: User;
  cookies?: Record<string, string>;
};

@Injectable()
export class GqlAuthGuard implements CanActivate {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Convert to GraphQL context
    const ctx = GqlExecutionContext.create(context);
    const { req, res } = ctx.getContext<{
      req?: RequestWithUser;
      res?: ExpressResponse;
    }>();

    if (!req) {
      throw new UnauthorizedException('Invalid request context');
    }

    // Try access token first.
    const accessToken = req.cookies?.['oyana-accessToken'];

    if (accessToken) {
      const user = await this.supabaseService.verifySession(
        `Bearer ${accessToken}`,
      );

      if (user) {
        req.user = user;
        return true;
      }
    }

    // Access token is invalid/expired, try refresh token.
    const refreshToken = req.cookies?.['oyana-refreshToken'];

    if (!refreshToken) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    const { data, error } = await this.supabaseService.getClient().auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session || !data.user) {
      this.clearAuthCookies(res);
      throw new UnauthorizedException('Invalid or expired session');
    }

    // Rotate cookies after refresh so next requests use fresh tokens.
    this.setAuthCookies(
      res,
      data.session.access_token,
      data.session.refresh_token,
    );

    if (req.cookies) {
      req.cookies['oyana-accessToken'] = data.session.access_token;
      req.cookies['oyana-refreshToken'] = data.session.refresh_token;
    }

    req.user = data.user;

    return true;
  }

  private setAuthCookies(
    response: ExpressResponse | undefined,
    accessToken: string,
    refreshToken: string,
  ): void {
    if (!response) return;

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

  private clearAuthCookies(response: ExpressResponse | undefined): void {
    if (!response) return;

    const isProduction = this.configService.get('NODE_ENV') === 'production';

    response.clearCookie('oyana-accessToken', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
    });

    response.clearCookie('oyana-refreshToken', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
    });
  }
}
