import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

type HeaderBag = Record<string, unknown>;

@Injectable()
export class MobileClientGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const gqlContext = GqlExecutionContext.create(context);
    const req = gqlContext.getContext<{ req?: { headers?: HeaderBag } }>()?.req;

    const platform = this.readHeader(
      req?.headers,
      'x-oyana-client-platform',
    )?.toLowerCase();
    if (platform !== 'mobile') {
      throw new ForbiddenException(
        'This operation can only be started from mobile clients',
      );
    }

    // Strict mobile-only enforcement: browser requests carry fetch/origin headers.
    if (
      this.readHeader(req?.headers, 'origin') ||
      this.readHeader(req?.headers, 'referer') ||
      this.readHeader(req?.headers, 'sec-fetch-mode')
    ) {
      throw new ForbiddenException(
        'Browser-origin verification starts are not allowed',
      );
    }

    const userAgent =
      this.readHeader(req?.headers, 'user-agent')?.toLowerCase() ?? '';
    const looksBrowserAgent =
      /(mozilla\/|chrome\/|safari\/|firefox\/|edg\/)/.test(userAgent);
    const looksNativeAgent = /(expo|reactnative|okhttp|dalvik|cfnetwork)/.test(
      userAgent,
    );

    if (looksBrowserAgent && !looksNativeAgent) {
      throw new ForbiddenException(
        'Browser-origin verification starts are not allowed',
      );
    }

    return true;
  }

  private readHeader(
    headers: HeaderBag | undefined,
    name: string,
  ): string | undefined {
    if (!headers) {
      return undefined;
    }

    const direct =
      headers[name] ??
      headers[name.toLowerCase()] ??
      headers[name.toUpperCase()];
    const value = Array.isArray(direct) ? direct[0] : direct;
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }

    return undefined;
  }
}
