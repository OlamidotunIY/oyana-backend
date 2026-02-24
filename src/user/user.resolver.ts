import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { Profile } from '../graphql/types/core/profile.type';
import { UpdateProfileInput } from '../graphql/dto/core/profile.dto';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SupabaseUser } from '../auth/supabase/supabase.types';

@Resolver(() => Profile)
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @Query(() => Profile, { nullable: true })
  @UseGuards(GqlAuthGuard)
  async me(@CurrentUser() user: SupabaseUser): Promise<Profile | null> {
    return this.userService.findProfileById(user.id);
  }

  @Mutation(() => Profile)
  @UseGuards(GqlAuthGuard)
  async updateProfile(
    @CurrentUser() user: SupabaseUser,
    @Args('input') input: UpdateProfileInput,
  ): Promise<Profile> {
    return this.userService.updateProfile(user.id, input);
  }
}
