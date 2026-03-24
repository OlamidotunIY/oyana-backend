import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { GqlExecutionContext } from '@nestjs/graphql';
import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';
import { AuthService } from '../auth.service';
import type { AuthUser } from '../auth.types';

type RequestWithUser = ExpressRequest & {
  user?: AuthUser;
  cookies?: Record<string, string>;
};

@Injectable()
export class GqlAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context);
    const { req, res } = ctx.getContext<{
      req?: RequestWithUser;
      res?: ExpressResponse;
    }>();

    if (!req) {
      throw new UnauthorizedException('Invalid request context');
    }

    const secret = this.configService.getOrThrow<string>('JWT_SECRET');

    // 1. Try Authorization header
    const authHeader = req.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const user = this.verifyJwt(authHeader.slice(7), secret);
      if (user) {
        req.user = user;
        return true;
      }
    }

    // 2. Try access token cookie
    const accessCookie = req.cookies?.['oyana-accessToken'];
    if (accessCookie) {
      const user = this.verifyJwt(accessCookie, secret);
      if (user) {
        req.user = user;
        return true;
      }
    }

    // 3. Try refresh token rotation
    const refreshCookie = req.cookies?.['oyana-refreshToken'];
    if (refreshCookie && res) {
      const user = await this.authService.rotateSession(
        refreshCookie,
        req,
        res,
      );
      if (user) {
        req.user = user;
        return true;
      }
    }

    throw new UnauthorizedException('Authentication required');
  }

  private verifyJwt(token: string, secret: string): AuthUser | null {
    try {
      const payload = this.jwtService.verify<{ sub: string; email: string }>(
        token,
        { secret },
      );
      return { id: payload.sub, email: payload.email };
    } catch {
      return null;
    }
  }
}
