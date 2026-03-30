import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import {
  NotificationSettings,
  Profile,
  ProfileImageUploadUrl,
  PushDevice,
} from '../graphql/types/core';
import {
  CompleteDriverRegistrationInput,
  CreateProfileImageUploadUrlInput,
  SetProviderAvailabilityInput,
  SetProfileImageInput,
  UpdateNotificationSettingsInput,
  UpdateProfileInput,
  UpsertPushDeviceInput,
} from '../graphql/dto/core';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';

@Resolver(() => Profile)
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @Query(() => Profile, { nullable: true })
  @UseGuards(GqlAuthGuard)
  async me(@CurrentUser() user: AuthUser): Promise<Profile | null> {
    return this.userService.findProfileById(user.id);
  }

  @Mutation(() => Profile)
  @UseGuards(GqlAuthGuard)
  async updateProfile(
    @CurrentUser() user: AuthUser,
    @Args('input') input: UpdateProfileInput,
  ): Promise<Profile> {
    return this.userService.updateProfile(user.id, input);
  }

  @Mutation(() => ProfileImageUploadUrl)
  @UseGuards(GqlAuthGuard)
  async createProfileImageUploadUrl(
    @CurrentUser() user: AuthUser,
    @Args('input') input: CreateProfileImageUploadUrlInput,
  ): Promise<ProfileImageUploadUrl> {
    return this.userService.createProfileImageUploadUrl(user.id, input);
  }

  @Mutation(() => Profile)
  @UseGuards(GqlAuthGuard)
  async setProfileImage(
    @CurrentUser() user: AuthUser,
    @Args('input') input: SetProfileImageInput,
  ): Promise<Profile> {
    return this.userService.setProfileImage(user.id, input);
  }

  @Mutation(() => Profile)
  @UseGuards(GqlAuthGuard)
  async completeDriverRegistration(
    @CurrentUser() user: AuthUser,
    @Args('input') input: CompleteDriverRegistrationInput,
  ): Promise<Profile> {
    return this.userService.completeDriverRegistration(user.id, input);
  }

  @Mutation(() => Profile)
  @UseGuards(GqlAuthGuard)
  async setProviderAvailability(
    @CurrentUser() user: AuthUser,
    @Args('input') input: SetProviderAvailabilityInput,
  ): Promise<Profile> {
    return this.userService.setProviderAvailability(user.id, input);
  }

  @Query(() => NotificationSettings)
  @UseGuards(GqlAuthGuard)
  async myNotificationSettings(
    @CurrentUser() user: AuthUser,
  ): Promise<NotificationSettings> {
    return this.userService.getNotificationSettings(user.id);
  }

  @Mutation(() => NotificationSettings)
  @UseGuards(GqlAuthGuard)
  async updateNotificationSettings(
    @CurrentUser() user: AuthUser,
    @Args('input') input: UpdateNotificationSettingsInput,
  ): Promise<NotificationSettings> {
    return this.userService.updateNotificationSettings(user.id, input);
  }

  @Mutation(() => PushDevice)
  @UseGuards(GqlAuthGuard)
  async upsertPushDevice(
    @CurrentUser() user: AuthUser,
    @Args('input') input: UpsertPushDeviceInput,
  ): Promise<PushDevice> {
    return this.userService.upsertPushDevice(user.id, input);
  }
}
