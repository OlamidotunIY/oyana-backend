import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
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

type RefreshSessionResult = Awaited<
  ReturnType<ReturnType<SupabaseService['getClient']>['auth']['refreshSession']>
>;

@Injectable()
export class GqlAuthGuard implements CanActivate {
  private readonly logger = new Logger(GqlAuthGuard.name);
  private readonly refreshSessionInFlight = new Map<string, Promise<RefreshSessionResult>>();

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
    const operationName =
      typeof (req as any)?.body?.operationName === 'string'
        ? ((req as any).body.operationName as string)
        : undefined;

    if (!req) {
      throw new UnauthorizedException('Invalid request context');
    }

    // Try Authorization header first (Bearer token).
    const authorizationHeader = req.headers?.authorization;
    if (authorizationHeader?.startsWith('Bearer ')) {
      const user = await this.supabaseService.verifySession(authorizationHeader);
      if (user) {
        req.user = user;
        return true;
      }

      this.logger.warn(
        `Authorization header token invalid for GraphQL operation ${operationName ?? 'unknown'}. Falling back to cookie auth.`,
      );
    }

    // Try access token cookie.
    const accessToken = req.cookies?.['oyana-accessToken'];

    if (accessToken) {
      const user = await this.supabaseService.verifySession(
        `Bearer ${accessToken}`,
      );

      if (user) {
        req.user = user;
        return true;
      }

      this.logger.warn(
        `Access token cookie invalid for GraphQL operation ${operationName ?? 'unknown'}. Trying refresh token.`,
      );
    }

    // Access token is invalid/expired, try refresh token.
    const refreshToken = req.cookies?.['oyana-refreshToken'];

    if (!refreshToken) {
      this.logger.warn(
        `No refresh token cookie found for GraphQL operation ${operationName ?? 'unknown'}.`,
      );
      throw new UnauthorizedException('Invalid or expired session');
    }

    const { data, error } = await this.refreshSession(refreshToken);

    if (error || !data.session || !data.user) {
      this.logger.warn(
        `Refresh session failed for GraphQL operation ${operationName ?? 'unknown'}: ${error?.message ?? 'unknown error'}`,
      );

      // Refresh-token rotation can create short-lived races across parallel requests.
      // In that case, avoid clearing cookies preemptively and let the next request settle.
      const isRefreshReuseRace =
        typeof error?.message === 'string' &&
        error.message.toLowerCase().includes('already used');

      if (!isRefreshReuseRace) {
        this.clearAuthCookies(res);
      }

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
    if (!this.canMutateHeaders(response)) {
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

  private clearAuthCookies(response: ExpressResponse | undefined): void {
    if (!this.canMutateHeaders(response)) {
      this.logger.warn(
        'Skipping auth cookie clear because headers are already sent or response is closed.',
      );
      return;
    }

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

  private canMutateHeaders(
    response: ExpressResponse | undefined,
  ): response is ExpressResponse {
    return Boolean(response && !response.headersSent && !response.writableEnded);
  }

  private async refreshSession(refreshToken: string) {
    const inFlightRefresh = this.refreshSessionInFlight.get(refreshToken);
    if (inFlightRefresh) {
      return inFlightRefresh;
    }

    const refreshRequest = this.supabaseService
      .getClient()
      .auth.refreshSession({
        refresh_token: refreshToken,
      })
      .finally(() => {
        this.refreshSessionInFlight.delete(refreshToken);
      });

    this.refreshSessionInFlight.set(refreshToken, refreshRequest);
    return refreshRequest;
  }
}
