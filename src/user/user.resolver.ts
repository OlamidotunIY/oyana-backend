import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import {
  DriverDocumentUploadUrl,
  DriverPresenceRecord,
  DriverProfileRecord,
  NotificationSettings,
  NotificationInboxItem,
  Profile,
  ProfileImageUploadUrl,
  PushDevice,
} from '../graphql/types/core';
import {
  AddDriverComplianceDocumentInput,
  CreateDriverDocumentUploadUrlInput,
  CreateProfileImageUploadUrlInput,
  ReviewDriverOnboardingInput,
  SaveDriverIdentityInfoInput,
  SaveDriverPersonalInfoInput,
  SetProfileImageInput,
  SubmitDriverOnboardingInput,
  SwitchAppModeInput,
  UpdateNotificationSettingsInput,
  UpdateDriverPresenceInput,
  UpdateProfileInput,
  UpsertPushDeviceInput,
} from '../graphql/dto/core';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserType } from '../graphql/enums';

@Resolver(() => Profile)
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @Query(() => Profile, { nullable: true })
  @UseGuards(GqlAuthGuard)
  async me(@CurrentUser() user: AuthUser): Promise<Profile | null> {
    return this.userService.findProfileById(user.id);
  }

  @Query(() => DriverProfileRecord, { nullable: true })
  @UseGuards(GqlAuthGuard)
  async myDriverProfile(
    @CurrentUser() user: AuthUser,
  ): Promise<DriverProfileRecord | null> {
    return this.userService.myDriverProfile(user.id);
  }

  @Query(() => [NotificationInboxItem])
  @UseGuards(GqlAuthGuard)
  async myNotificationInbox(
    @CurrentUser() user: AuthUser,
    @Args('take', { type: () => Int, nullable: true }) take?: number,
  ): Promise<NotificationInboxItem[]> {
    return this.userService.myNotificationInbox(user.id, take);
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

  @Mutation(() => DriverDocumentUploadUrl)
  @UseGuards(GqlAuthGuard)
  async createDriverDocumentUploadUrl(
    @CurrentUser() user: AuthUser,
    @Args('input') input: CreateDriverDocumentUploadUrlInput,
  ): Promise<DriverDocumentUploadUrl> {
    return this.userService.createDriverDocumentUploadUrl(user.id, input);
  }

  @Mutation(() => DriverProfileRecord)
  @UseGuards(GqlAuthGuard)
  async saveDriverPersonalInfo(
    @CurrentUser() user: AuthUser,
    @Args('input') input: SaveDriverPersonalInfoInput,
  ): Promise<DriverProfileRecord> {
    return this.userService.saveDriverPersonalInfo(user.id, input);
  }

  @Mutation(() => DriverProfileRecord)
  @UseGuards(GqlAuthGuard)
  async saveDriverIdentityInfo(
    @CurrentUser() user: AuthUser,
    @Args('input') input: SaveDriverIdentityInfoInput,
  ): Promise<DriverProfileRecord> {
    return this.userService.saveDriverIdentityInfo(user.id, input);
  }

  @Mutation(() => DriverProfileRecord)
  @UseGuards(GqlAuthGuard)
  async addDriverComplianceDocument(
    @CurrentUser() user: AuthUser,
    @Args('input') input: AddDriverComplianceDocumentInput,
  ): Promise<DriverProfileRecord> {
    return this.userService.addDriverComplianceDocument(user.id, input);
  }

  @Mutation(() => DriverProfileRecord)
  @UseGuards(GqlAuthGuard)
  async submitDriverOnboarding(
    @CurrentUser() user: AuthUser,
    @Args('input') input: SubmitDriverOnboardingInput,
  ): Promise<DriverProfileRecord> {
    return this.userService.submitDriverOnboarding(user.id, input);
  }

  @Mutation(() => DriverProfileRecord)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  async reviewDriverOnboarding(
    @CurrentUser() user: AuthUser,
    @Args('input') input: ReviewDriverOnboardingInput,
  ): Promise<DriverProfileRecord> {
    return this.userService.reviewDriverOnboarding(user.id, input);
  }

  @Mutation(() => Profile)
  @UseGuards(GqlAuthGuard)
  async switchAppMode(
    @CurrentUser() user: AuthUser,
    @Args('input') input: SwitchAppModeInput,
  ): Promise<Profile> {
    return this.userService.switchAppMode(user.id, input);
  }

  @Mutation(() => DriverPresenceRecord)
  @UseGuards(GqlAuthGuard)
  async updateDriverPresence(
    @CurrentUser() user: AuthUser,
    @Args('input') input: UpdateDriverPresenceInput,
  ): Promise<DriverPresenceRecord> {
    return this.userService.updateDriverPresence(user.id, input);
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

  @Mutation(() => NotificationInboxItem)
  @UseGuards(GqlAuthGuard)
  async markNotificationRead(
    @CurrentUser() user: AuthUser,
    @Args('notificationId') notificationId: string,
  ): Promise<NotificationInboxItem> {
    return this.userService.markNotificationRead(user.id, notificationId);
  }

  @Mutation(() => Int)
  @UseGuards(GqlAuthGuard)
  async markAllNotificationsRead(
    @CurrentUser() user: AuthUser,
  ): Promise<number> {
    return this.userService.markAllNotificationsRead(user.id);
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
