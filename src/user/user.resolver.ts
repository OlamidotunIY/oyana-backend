import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { Profile } from '../graphql/types/core/profile.type';
import {
  ActivateRoleInput,
  SetProviderAvailabilityInput,
  UpdateProfileInput,
} from '../graphql/dto/core/profile.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { UserType } from '../graphql/enums';

@Resolver(() => Profile)
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @Query(() => Profile, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.INDIVIDUAL, UserType.BUSINESS)
  async me(@CurrentUser() user: AuthUser): Promise<Profile | null> {
    return this.userService.findProfileById(user.id);
  }

  @Mutation(() => Profile)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.INDIVIDUAL, UserType.BUSINESS)
  async updateProfile(
    @CurrentUser() user: AuthUser,
    @Args('input') input: UpdateProfileInput,
  ): Promise<Profile> {
    return this.userService.updateProfile(user.id, input);
  }

  @Mutation(() => Profile)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.INDIVIDUAL, UserType.BUSINESS)
  async activateRole(
    @CurrentUser() user: AuthUser,
    @Args('input') input: ActivateRoleInput,
  ): Promise<Profile> {
    return this.userService.activateRole(user.id, input);
  }

  @Mutation(() => Profile)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.BUSINESS)
  async setProviderAvailability(
    @CurrentUser() user: AuthUser,
    @Args('input') input: SetProviderAvailabilityInput,
  ): Promise<Profile> {
    return this.userService.setProviderAvailability(user.id, input);
  }
}
