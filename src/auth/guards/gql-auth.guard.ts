import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class GqlAuthGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Convert to GraphQL context
    const ctx = GqlExecutionContext.create(context);
    const req = ctx.getContext().req;

    // Get authorization header
    const authHeader = req.headers?.authorization;

    // Verify session with Supabase
    const user = await this.supabaseService.verifySession(authHeader);

    if (!user) {
      throw new UnauthorizedException('Invalid or missing session');
    }

    // Attach user to request for resolvers
    req.user = user;

    return true;
  }
}
