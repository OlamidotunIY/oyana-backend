import { Resolver, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { Profile } from '../graphql/types/core/profile.type';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '@supabase/supabase-js';

@Resolver(() => Profile)
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @Query(() => Profile, { nullable: true })
  @UseGuards(GqlAuthGuard)
  async me(@CurrentUser() user: User): Promise<any> {
    const profile = await this.userService.findProfileById(user.id);

    if (!profile) {
      return null;
    }

    // Transform the Prisma result to match GraphQL schema
    return {
      ...profile,
      roles: profile.userRoles.map((userRole) => ({
        ...userRole.role,
        permissions: userRole.role.rolePermissions.map((rp) => rp.permission),
      })),
    };
  }
}
