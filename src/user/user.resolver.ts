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
  ActivateRoleInput,
  CompleteDriverRegistrationInput,
  CreateProfileImageUploadUrlInput,
  SetProviderAvailabilityInput,
  SetProfileImageInput,
  UpdateNotificationSettingsInput,
  UpdateProfileInput,
  UpsertPushDeviceInput,
} from '../graphql/dto/core';
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

  @Mutation(() => ProfileImageUploadUrl)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.INDIVIDUAL, UserType.BUSINESS)
  async createProfileImageUploadUrl(
    @CurrentUser() user: AuthUser,
    @Args('input') input: CreateProfileImageUploadUrlInput,
  ): Promise<ProfileImageUploadUrl> {
    return this.userService.createProfileImageUploadUrl(user.id, input);
  }

  @Mutation(() => Profile)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.INDIVIDUAL, UserType.BUSINESS)
  async setProfileImage(
    @CurrentUser() user: AuthUser,
    @Args('input') input: SetProfileImageInput,
  ): Promise<Profile> {
    return this.userService.setProfileImage(user.id, input);
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
  async completeDriverRegistration(
    @CurrentUser() user: AuthUser,
    @Args('input') input: CompleteDriverRegistrationInput,
  ): Promise<Profile> {
    return this.userService.completeDriverRegistration(user.id, input);
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

  @Query(() => NotificationSettings)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.INDIVIDUAL, UserType.BUSINESS)
  async myNotificationSettings(
    @CurrentUser() user: AuthUser,
  ): Promise<NotificationSettings> {
    return this.userService.getNotificationSettings(user.id);
  }

  @Mutation(() => NotificationSettings)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.INDIVIDUAL, UserType.BUSINESS)
  async updateNotificationSettings(
    @CurrentUser() user: AuthUser,
    @Args('input') input: UpdateNotificationSettingsInput,
  ): Promise<NotificationSettings> {
    return this.userService.updateNotificationSettings(user.id, input);
  }

  @Mutation(() => PushDevice)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.INDIVIDUAL, UserType.BUSINESS)
  async upsertPushDevice(
    @CurrentUser() user: AuthUser,
    @Args('input') input: UpsertPushDeviceInput,
  ): Promise<PushDevice> {
    return this.userService.upsertPushDevice(user.id, input);
  }
}
