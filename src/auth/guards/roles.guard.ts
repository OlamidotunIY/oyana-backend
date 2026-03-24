import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { PrismaService } from '../../database/prisma.service';
import { UserType } from '../../graphql/enums';
import { ROLES_KEY, type AppUserRole } from '../decorators/roles.decorator';
import type { AuthUser } from '../auth.types';
import { normalizeProfileRoles, resolveProfileRole } from '../utils/roles.util';

type RequestWithUser = {
  user?: AuthUser;
  userRole?: UserType;
  userRoles?: UserType[];
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<AppUserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const gqlContext = GqlExecutionContext.create(context);
    const request = gqlContext.getContext<{ req?: RequestWithUser }>().req;

    if (!request?.user?.id) {
      throw new UnauthorizedException('Authentication required');
    }

    const profile = await this.prisma.runWithRetry(
      'RolesGuard.canActivate.profile',
      () =>
        this.prisma.profile.findUnique({
          where: {
            id: request.user!.id,
          },
          select: {
            roles: true,
          },
        }),
    );

    if (!profile) {
      throw new UnauthorizedException('Profile not found');
    }

    const userRoles = normalizeProfileRoles(profile);
    request.userRoles = userRoles;
    request.userRole = resolveProfileRole(profile, requiredRoles);

    if (!requiredRoles.includes(request.userRole)) {
      throw new ForbiddenException('Insufficient role permission');
    }

    return true;
  }
}
