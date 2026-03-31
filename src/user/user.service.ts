import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  Prisma,
  VehicleCategory as PrismaVehicleCategory,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  AddDriverComplianceDocumentInput,
  CompleteDriverRegistrationInput,
  CreateDriverDocumentUploadUrlInput,
  CreateProfileImageUploadUrlInput,
  ReviewDriverOnboardingInput,
  SaveDriverIdentityInfoInput,
  SaveDriverPersonalInfoInput,
  SaveDriverVehicleInput,
  SetProviderAvailabilityInput,
  SetProfileImageInput,
  SubmitDriverOnboardingInput,
  SwitchAppModeInput,
  UpdateNotificationSettingsInput,
  UpdateDriverPresenceInput,
  UpdateProfileInput,
  UpsertPushDeviceInput,
} from '../graphql/dto/core';
import {
  AppMode,
  DriverCapability,
  DriverOnboardingStatus,
  DriverType,
  NotificationCategory,
  OnboardingStep,
  PreferredLanguage,
  PublicRole,
  UserRole,
} from '../graphql/enums';
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
import { GoogleStorageService } from '../storage/google-storage.service';
import {
  isDriverOnboardingCompleted,
  isDriverRole,
  mapDriverTypeToVehicleCategory,
  normalizeDriverType,
  resolveActiveProvider,
} from './driver-onboarding.util';

const driverVehicleSelection = {
  id: true,
  category: true,
  plateNumber: true,
  vin: true,
  make: true,
  model: true,
  color: true,
  capacityKg: true,
  capacityVolumeCm3: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.DriverVehicleSelect;

const driverDocumentSelection = {
  id: true,
  type: true,
  status: true,
  storageBucket: true,
  storagePath: true,
  mimeType: true,
  notes: true,
  uploadedAt: true,
  reviewedAt: true,
} satisfies Prisma.DriverComplianceDocumentSelect;

const driverSubmissionSelection = {
  id: true,
  status: true,
  rejectionReason: true,
  reviewerId: true,
  snapshot: true,
  submittedAt: true,
  reviewedAt: true,
} satisfies Prisma.DriverOnboardingSubmissionSelect;

const driverPresenceSelection = {
  id: true,
  isOnline: true,
  lat: true,
  lng: true,
  accuracyMeters: true,
  heading: true,
  speedKph: true,
  recordedAt: true,
  lastHeartbeatAt: true,
  updatedAt: true,
} satisfies Prisma.DriverPresenceSelect;

const driverProfileSelection = {
  id: true,
  profileId: true,
  providerId: true,
  onboardingStatus: true,
  driverType: true,
  legalFirstName: true,
  legalLastName: true,
  dateOfBirth: true,
  selfieStorageBucket: true,
  selfieStoragePath: true,
  licenseNumber: true,
  licenseExpiryAt: true,
  identityType: true,
  identityNumber: true,
  insurancePolicyNumber: true,
  rejectionReason: true,
  canDispatch: true,
  canFreight: true,
  submittedAt: true,
  reviewedAt: true,
  approvedAt: true,
  createdAt: true,
  updatedAt: true,
  vehicle: {
    select: driverVehicleSelection,
  },
  complianceDocuments: {
    orderBy: [{ uploadedAt: 'desc' }, { createdAt: 'desc' }],
    select: driverDocumentSelection,
  },
  submissions: {
    orderBy: { submittedAt: 'desc' },
    take: 10,
    select: driverSubmissionSelection,
  },
  presence: {
    select: driverPresenceSelection,
  },
} satisfies Prisma.DriverProfileSelect;

const profileSelection = {
  id: true,
  email: true,
  emailVerified: true,
  emailVerifiedAt: true,
  role: true,
  accountRole: true,
  activeAppMode: true,
  firstName: true,
  lastName: true,
  phoneE164: true,
  profileImageBucket: true,
  profileImagePath: true,
  phoneVerified: true,
  phoneVerifiedAt: true,
  state: true,
  activeAddressId: true,
  referralCode: true,
  preferredLanguage: true,
  notificationsEnabled: true,
  notificationPromptedAt: true,
  pushPermissionGranted: true,
  pushPermissionStatus: true,
  status: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  driverProfile: {
    select: driverProfileSelection,
  },
  walletAccounts: {
    take: 1,
    select: {
      balanceMinor: true,
      escrowMinor: true,
      currency: true,
    },
  },
  activeAddress: {
    select: {
      id: true,
      address: true,
      city: true,
    },
  },
  contactForProviders: {
    select: {
      id: true,
      businessName: true,
      driverType: true,
      isAvailable: true,
      availabilityUpdatedAt: true,
      vehicle: {
        select: {
          category: true,
          plateNumber: true,
          capacityKg: true,
        },
      },
    },
    take: 1,
  },
  providerMembers: {
    where: {
      status: 'active',
    },
    orderBy: {
      createdAt: 'asc',
    },
    take: 1,
    select: {
      role: true,
      provider: {
        select: {
          id: true,
          businessName: true,
          driverType: true,
          isAvailable: true,
          availabilityUpdatedAt: true,
          vehicle: {
            select: {
              category: true,
              plateNumber: true,
              capacityKg: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ProfileSelect;

type ProfileRecord = Prisma.ProfileGetPayload<{
  select: typeof profileSelection;
}>;

type DriverProfileDbRecord = NonNullable<ProfileRecord['driverProfile']>;

const driverOnboardingSelection = {
  accountRole: true,
  activeAppMode: true,
  role: true,
  emailVerified: true,
  phoneE164: true,
  phoneVerified: true,
  notificationPromptedAt: true,
  activeAddressId: true,
  driverProfile: {
    select: {
      id: true,
      onboardingStatus: true,
      canDispatch: true,
      canFreight: true,
      providerId: true,
    },
  },
  contactForProviders: {
    select: {
      id: true,
      driverType: true,
      vehicle: {
        select: {
          category: true,
          plateNumber: true,
          capacityKg: true,
        },
      },
    },
    take: 1,
  },
  providerMembers: {
    where: {
      status: 'active',
    },
    orderBy: {
      createdAt: 'asc',
    },
    take: 1,
    select: {
      provider: {
        select: {
          id: true,
          driverType: true,
          vehicle: {
            select: {
              category: true,
              plateNumber: true,
              capacityKg: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ProfileSelect;

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly googleStorageService: GoogleStorageService,
  ) {}

  private normalizePreferredLanguage(
    value: string | null | undefined,
  ): Profile['preferredLanguage'] {
    return value === PreferredLanguage.ZH_HANS
      ? PreferredLanguage.ZH_HANS
      : PreferredLanguage.EN;
  }

  private resolveDriverOnboardingStatus(
    profile: Pick<ProfileRecord, 'driverProfile'>,
  ): DriverOnboardingStatus {
    return (
      profile.driverProfile?.onboardingStatus ??
      DriverOnboardingStatus.NOT_STARTED
    );
  }

  private resolveDriverType(
    profile: Pick<ProfileRecord, 'driverProfile' | 'contactForProviders' | 'providerMembers'>,
  ): DriverType | null {
    return (
      normalizeDriverType(profile.driverProfile?.driverType) ??
      normalizeDriverType(resolveActiveProvider(profile)?.driverType)
    );
  }

  private resolveDriverCapabilities(
    driverProfile: ProfileRecord['driverProfile'],
  ): DriverCapability[] {
    if (!driverProfile) {
      return [];
    }

    const capabilities: DriverCapability[] = [];

    if (driverProfile.canDispatch) {
      capabilities.push(DriverCapability.DISPATCH);
    }

    if (driverProfile.canFreight) {
      capabilities.push(DriverCapability.FREIGHT);
    }

    return capabilities;
  }

  private resolveCurrentMode(profile: ProfileRecord): AppMode {
    const driverApproved =
      profile.driverProfile?.onboardingStatus === DriverOnboardingStatus.APPROVED;

    if (driverApproved && profile.activeAppMode === AppMode.DRIVER) {
      return AppMode.DRIVER;
    }

    return AppMode.SHIPPER;
  }

  private resolveAvailableModes(profile: ProfileRecord): AppMode[] {
    const availableModes = [AppMode.SHIPPER];

    if (
      profile.driverProfile?.onboardingStatus === DriverOnboardingStatus.APPROVED
    ) {
      availableModes.push(AppMode.DRIVER);
    }

    return availableModes;
  }

  private resolvePublicRoleForMode(
    profile: ProfileRecord,
    currentMode: AppMode,
    driverType: DriverType | null,
  ): PublicRole {
    if (profile.accountRole === 'admin' || profile.role === UserRole.ADMIN) {
      return PublicRole.ADMIN;
    }

    if (currentMode !== AppMode.DRIVER || !driverType) {
      return PublicRole.SHIPPER;
    }

    if (driverType === DriverType.BIKE) {
      return PublicRole.RIDER;
    }

    if (driverType === DriverType.VAN) {
      return PublicRole.VAN_DRIVER;
    }

    if (driverType === DriverType.TRUCK) {
      return PublicRole.TRUCK_DRIVER;
    }

    return PublicRole.SHIPPER;
  }

  private resolveLegacyOnboardingStep(profile: ProfileRecord): OnboardingStep {
    const driverStatus = this.resolveDriverOnboardingStatus(profile);

    if (
      profile.accountRole === 'admin' ||
      driverStatus === DriverOnboardingStatus.APPROVED ||
      !profile.driverProfile
    ) {
      return OnboardingStep.COMPLETED;
    }

    return OnboardingStep.DRIVER_REGISTRATION;
  }

  private async toGraphqlProfile(profile: ProfileRecord): Promise<Profile> {
    const activeProvider = resolveActiveProvider(profile);
    const driverType = this.resolveDriverType(profile);
    const currentMode = this.resolveCurrentMode(profile);
    const [profileImageUrl, unreadNotificationCount] = await Promise.all([
      this.resolveProfileImageUrl(profile),
      this.prisma.notification.count({
        where: {
          recipientProfileId: profile.id,
          isRead: false,
        },
      }),
    ]);
    const driverCapabilities = this.resolveDriverCapabilities(profile.driverProfile);
    const onboardingStep = this.resolveLegacyOnboardingStep(profile);
    const wallet = profile.walletAccounts[0] ?? null;

    return {
      id: profile.id,
      email: profile.email,
      emailVerified: profile.emailVerified,
      emailVerifiedAt: profile.emailVerifiedAt,
      role: profile.role ?? null,
      accountRole: profile.accountRole,
      availableModes: this.resolveAvailableModes(profile),
      currentMode,
      firstName: profile.firstName,
      lastName: profile.lastName,
      phoneE164: profile.phoneE164,
      profileImageUrl,
      phoneVerified: profile.phoneVerified,
      phoneVerifiedAt: profile.phoneVerifiedAt,
      state: profile.state,
      referralCode: profile.referralCode,
      preferredLanguage: this.normalizePreferredLanguage(
        profile.preferredLanguage,
      ),
      notificationsEnabled: profile.notificationsEnabled,
      notificationPromptedAt: profile.notificationPromptedAt,
      pushPermissionGranted: profile.pushPermissionGranted,
      pushPermissionStatus: profile.pushPermissionStatus,
      status: profile.status,
      lastLoginAt: profile.lastLoginAt,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      businessName: activeProvider?.businessName ?? null,
      publicRole: this.resolvePublicRoleForMode(profile, currentMode, driverType),
      driverType,
      driverProfileId: profile.driverProfile?.id ?? null,
      driverOnboardingStatus: this.resolveDriverOnboardingStatus(profile),
      driverCapabilities,
      providerId: profile.driverProfile?.providerId ?? activeProvider?.id ?? null,
      providerIsAvailable: activeProvider?.isAvailable ?? null,
      providerAvailabilityUpdatedAt:
        activeProvider?.availabilityUpdatedAt ?? null,
      primaryAddress: profile.activeAddress?.address ?? null,
      city: profile.activeAddress?.city ?? null,
      activeAddressId: profile.activeAddressId ?? null,
      walletBalanceMinor: wallet?.balanceMinor ?? null,
      walletEscrowMinor: wallet?.escrowMinor ?? null,
      walletCurrency: wallet?.currency ?? null,
      unreadNotificationCount,
      onboardingStep,
      onboardingCompleted: onboardingStep === OnboardingStep.COMPLETED,
    };
  }

  async getProfileByEmail(email: string): Promise<Profile | null> {
    const profile = await this.prisma.profile.findUnique({
      where: { email },
      select: profileSelection,
    });

    if (!profile) {
      return null;
    }

    return this.toGraphqlProfile(profile);
  }

  async findProfileById(profileId: string): Promise<Profile | null> {
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      select: profileSelection,
    });

    if (!profile) {
      return null;
    }

    return this.toGraphqlProfile(profile);
  }

  async assertDriverOnboardingComplete(profileId: string): Promise<void> {
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      select: driverOnboardingSelection,
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const approvedDriverProfile =
      profile.driverProfile?.onboardingStatus ===
      DriverOnboardingStatus.APPROVED;
    const legacyApproved =
      isDriverRole(profile.role ?? null) && isDriverOnboardingCompleted(profile);

    if (!approvedDriverProfile && !legacyApproved) {
      throw new ForbiddenException(
        'Complete driver onboarding and approval before accessing driver operations.',
      );
    }
  }

  async updateProfile(
    profileId: string,
    input: UpdateProfileInput,
  ): Promise<Profile> {
    const updateData: Prisma.ProfileUpdateInput = {};
    const currentProfile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      select: {
        phoneE164: true,
      },
    });

    if (input.firstName !== undefined) {
      updateData.firstName = input.firstName;
    }

    if (input.lastName !== undefined) {
      updateData.lastName = input.lastName;
    }

    // If phoneE164 is provided, update it
    if (input.phoneE164 !== undefined) {
      updateData.phoneE164 = input.phoneE164;
      if (currentProfile?.phoneE164 !== input.phoneE164) {
        updateData.phoneVerified = false;
        updateData.phoneVerifiedAt = null;
      }
    }

    // If preferredLanguage is provided, update it
    if (input.preferredLanguage !== undefined) {
      updateData.preferredLanguage = input.preferredLanguage;
    }

    // If status is provided, update it
    if (input.status !== undefined) {
      updateData.status = input.status;
    }

    const profile = await this.prisma.profile.update({
      where: { id: profileId },
      data: updateData,
      select: profileSelection,
    });

    return this.toGraphqlProfile(profile);
  }

  async createProfileImageUploadUrl(
    profileId: string,
    input: CreateProfileImageUploadUrlInput,
  ): Promise<ProfileImageUploadUrl> {
    const bucket = this.getProfileImageBucketName();
    const mimeType = input.mimeType?.trim() || 'image/jpeg';
    const expiresInSeconds = Math.max(
      Number(
        this.configService.get<string>(
          'PROFILE_IMAGE_UPLOAD_URL_TTL_SECONDS',
        ) ?? 900,
      ),
      60,
    );
    const storagePath = this.buildProfileImageStoragePath(
      profileId,
      input.fileName,
    );
    const uploadUrl = await this.googleStorageService.createSignedUploadUrl({
      bucketName: bucket,
      objectPath: storagePath,
      expiresInSeconds,
      contentType: mimeType,
    });

    return {
      storageBucket: bucket,
      storagePath,
      uploadUrl,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
    };
  }

  async setProfileImage(
    profileId: string,
    input: SetProfileImageInput,
  ): Promise<Profile> {
    const profile = await this.prisma.profile.update({
      where: { id: profileId },
      data: {
        profileImageBucket: input.storageBucket.trim(),
        profileImagePath: input.storagePath.trim(),
      },
      select: profileSelection,
    });

    return this.toGraphqlProfile(profile);
  }

  async myDriverProfile(profileId: string): Promise<DriverProfileRecord | null> {
    const driverProfile = await this.prisma.driverProfile.findUnique({
      where: { profileId },
      select: driverProfileSelection,
    });

    if (!driverProfile) {
      return null;
    }

    return this.toGraphqlDriverProfile(driverProfile);
  }

  async createDriverDocumentUploadUrl(
    profileId: string,
    input: CreateDriverDocumentUploadUrlInput,
  ): Promise<DriverDocumentUploadUrl> {
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      select: { id: true },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const bucket = this.getProfileImageBucketName();
    const mimeType = input.mimeType?.trim() || 'application/octet-stream';
    const expiresInSeconds = Math.max(
      Number(
        this.configService.get<string>('PROFILE_IMAGE_UPLOAD_URL_TTL_SECONDS') ??
          900,
      ),
      60,
    );
    const storagePath = this.buildDriverDocumentStoragePath(
      profileId,
      input.documentType,
      input.fileName,
    );
    const uploadUrl = await this.googleStorageService.createSignedUploadUrl({
      bucketName: bucket,
      objectPath: storagePath,
      expiresInSeconds,
      contentType: mimeType,
    });

    return {
      storageBucket: bucket,
      storagePath,
      uploadUrl,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
    };
  }

  async saveDriverPersonalInfo(
    profileId: string,
    input: SaveDriverPersonalInfoInput,
  ): Promise<DriverProfileRecord> {
    const driverType = mapDriverTypeToVehicleCategory(input.driverType);
    if (!driverType) {
      throw new BadRequestException('Driver type is invalid');
    }

    const driverProfile = await this.prisma.$transaction(async (tx) => {
      const currentDriverProfile = await this.ensureDraftDriverProfile(tx, profileId);

      return tx.driverProfile.update({
        where: { id: currentDriverProfile.id },
        data: {
          ...this.buildDriverDraftUpdate(currentDriverProfile.onboardingStatus),
          driverType,
          legalFirstName: input.legalFirstName.trim(),
          legalLastName: input.legalLastName.trim(),
          dateOfBirth: new Date(input.dateOfBirth),
          selfieStorageBucket: input.selfieStorageBucket?.trim() || null,
          selfieStoragePath: input.selfieStoragePath?.trim() || null,
        },
        select: driverProfileSelection,
      });
    });

    return this.toGraphqlDriverProfile(driverProfile);
  }

  async saveDriverIdentityInfo(
    profileId: string,
    input: SaveDriverIdentityInfoInput,
  ): Promise<DriverProfileRecord> {
    const driverProfile = await this.prisma.$transaction(async (tx) => {
      const currentDriverProfile = await this.ensureDraftDriverProfile(tx, profileId);

      return tx.driverProfile.update({
        where: { id: currentDriverProfile.id },
        data: {
          ...this.buildDriverDraftUpdate(currentDriverProfile.onboardingStatus),
          licenseNumber: input.licenseNumber.trim(),
          licenseExpiryAt: new Date(input.licenseExpiryAt),
          identityType: input.identityType.trim(),
          identityNumber: input.identityNumber.trim(),
          insurancePolicyNumber: input.insurancePolicyNumber?.trim() || null,
        },
        select: driverProfileSelection,
      });
    });

    return this.toGraphqlDriverProfile(driverProfile);
  }

  async saveDriverVehicle(
    profileId: string,
    input: SaveDriverVehicleInput,
  ): Promise<DriverProfileRecord> {
    const driverProfile = await this.prisma.$transaction(async (tx) => {
      const currentDriverProfile = await this.ensureDraftDriverProfile(tx, profileId);

      await tx.driverVehicle.upsert({
        where: {
          driverProfileId: currentDriverProfile.id,
        },
        update: {
          category: input.category,
          plateNumber: input.plateNumber.trim().toUpperCase(),
          vin: input.vin?.trim() || null,
          make: input.make?.trim() || null,
          model: input.model?.trim() || null,
          color: input.color?.trim() || null,
          capacityKg: input.capacityKg,
          capacityVolumeCm3: input.capacityVolumeCm3 ?? null,
        },
        create: {
          driverProfileId: currentDriverProfile.id,
          category: input.category,
          plateNumber: input.plateNumber.trim().toUpperCase(),
          vin: input.vin?.trim() || null,
          make: input.make?.trim() || null,
          model: input.model?.trim() || null,
          color: input.color?.trim() || null,
          capacityKg: input.capacityKg,
          capacityVolumeCm3: input.capacityVolumeCm3 ?? null,
        },
      });

      return tx.driverProfile.update({
        where: { id: currentDriverProfile.id },
        data: {
          ...this.buildDriverDraftUpdate(currentDriverProfile.onboardingStatus),
          driverType: input.category,
        },
        select: driverProfileSelection,
      });
    });

    return this.toGraphqlDriverProfile(driverProfile);
  }

  async addDriverComplianceDocument(
    profileId: string,
    input: AddDriverComplianceDocumentInput,
  ): Promise<DriverProfileRecord> {
    const driverProfile = await this.prisma.$transaction(async (tx) => {
      const currentDriverProfile = await this.ensureDraftDriverProfile(tx, profileId);

      await tx.driverComplianceDocument.create({
        data: {
          driverProfileId: currentDriverProfile.id,
          type: input.documentType,
          status: 'uploaded',
          storageBucket: input.storageBucket.trim(),
          storagePath: input.storagePath.trim(),
          mimeType: input.mimeType?.trim() || null,
          notes: input.notes?.trim() || null,
        },
      });

      return tx.driverProfile.update({
        where: { id: currentDriverProfile.id },
        data: this.buildDriverDraftUpdate(currentDriverProfile.onboardingStatus),
        select: driverProfileSelection,
      });
    });

    return this.toGraphqlDriverProfile(driverProfile);
  }

  async submitDriverOnboarding(
    profileId: string,
    input: SubmitDriverOnboardingInput,
  ): Promise<DriverProfileRecord> {
    const driverProfile = await this.prisma.$transaction(async (tx) => {
      const currentDriverProfile = await tx.driverProfile.findUnique({
        where: { profileId },
        select: driverProfileSelection,
      });

      if (!currentDriverProfile) {
        throw new BadRequestException('Complete driver details before submitting.');
      }

      this.assertDriverOnboardingSubmissionReady(currentDriverProfile);

      const submittedAt = new Date();
      const snapshot = this.buildDriverOnboardingSnapshot(currentDriverProfile);

      await tx.driverOnboardingSubmission.create({
        data: {
          driverProfileId: currentDriverProfile.id,
          status: DriverOnboardingStatus.IN_REVIEW,
          snapshot,
          submittedAt,
        },
      });

      return tx.driverProfile.update({
        where: { id: currentDriverProfile.id },
        data: {
          onboardingStatus: DriverOnboardingStatus.IN_REVIEW,
          rejectionReason: null,
          submittedAt,
          reviewedAt: null,
          approvedAt: null,
          canDispatch: false,
          canFreight: false,
        },
        select: driverProfileSelection,
      });
    });

    if (
      input.activateDriverMode &&
      driverProfile.onboardingStatus === DriverOnboardingStatus.APPROVED
    ) {
      await this.switchAppMode(profileId, { mode: AppMode.DRIVER });
      const refreshed = await this.myDriverProfile(profileId);
      if (refreshed) {
        return refreshed;
      }
    }

    return this.toGraphqlDriverProfile(driverProfile);
  }

  async reviewDriverOnboarding(
    reviewerProfileId: string,
    input: ReviewDriverOnboardingInput,
  ): Promise<DriverProfileRecord> {
    if (
      input.status !== DriverOnboardingStatus.APPROVED &&
      input.status !== DriverOnboardingStatus.REJECTED
    ) {
      throw new BadRequestException(
        'Driver onboarding reviews can only approve or reject submissions.',
      );
    }

    const driverProfile = await this.prisma.$transaction(async (tx) => {
      const currentDriverProfile = await tx.driverProfile.findUnique({
        where: { id: input.driverProfileId },
        select: driverProfileSelection,
      });

      if (!currentDriverProfile) {
        throw new NotFoundException('Driver profile not found');
      }

      const reviewedAt = new Date();
      let providerId = currentDriverProfile.providerId;
      let canDispatch = false;
      let canFreight = false;

      if (input.status === DriverOnboardingStatus.APPROVED) {
        this.assertDriverOnboardingSubmissionReady(currentDriverProfile);
        providerId = await this.syncOperationalProviderFromDriverProfile(
          tx,
          currentDriverProfile,
        );
        canDispatch = true;
        canFreight = currentDriverProfile.driverType !== DriverType.BIKE;

        await tx.profile.update({
          where: { id: currentDriverProfile.profileId },
          data: {
            activeAppMode: AppMode.DRIVER,
          },
        });
      } else {
        await tx.profile.update({
          where: { id: currentDriverProfile.profileId },
          data: {
            activeAppMode: AppMode.SHIPPER,
          },
        });
      }

      const latestSubmission = await tx.driverOnboardingSubmission.findFirst({
        where: {
          driverProfileId: currentDriverProfile.id,
        },
        orderBy: { submittedAt: 'desc' },
        select: { id: true },
      });

      if (latestSubmission) {
        await tx.driverOnboardingSubmission.update({
          where: { id: latestSubmission.id },
          data: {
            status: input.status,
            rejectionReason:
              input.status === DriverOnboardingStatus.REJECTED
                ? input.rejectionReason?.trim() || 'Rejected by admin'
                : null,
            reviewerId: reviewerProfileId,
            reviewedAt,
          },
        });
      } else {
        await tx.driverOnboardingSubmission.create({
          data: {
            driverProfileId: currentDriverProfile.id,
            status: input.status,
            rejectionReason:
              input.status === DriverOnboardingStatus.REJECTED
                ? input.rejectionReason?.trim() || 'Rejected by admin'
                : null,
            reviewerId: reviewerProfileId,
            snapshot: this.buildDriverOnboardingSnapshot(currentDriverProfile),
            submittedAt: currentDriverProfile.submittedAt ?? reviewedAt,
            reviewedAt,
          },
        });
      }

      return tx.driverProfile.update({
        where: { id: currentDriverProfile.id },
        data: {
          providerId: providerId ?? null,
          onboardingStatus: input.status,
          rejectionReason:
            input.status === DriverOnboardingStatus.REJECTED
              ? input.rejectionReason?.trim() || 'Rejected by admin'
              : null,
          reviewedAt,
          approvedAt:
            input.status === DriverOnboardingStatus.APPROVED ? reviewedAt : null,
          submittedAt: currentDriverProfile.submittedAt ?? reviewedAt,
          canDispatch,
          canFreight,
        },
        select: driverProfileSelection,
      });
    });

    return this.toGraphqlDriverProfile(driverProfile);
  }

  async switchAppMode(
    profileId: string,
    input: SwitchAppModeInput,
  ): Promise<Profile> {
    if (input.mode === AppMode.DRIVER) {
      await this.assertDriverOnboardingComplete(profileId);
    }

    const profile = await this.prisma.profile.update({
      where: { id: profileId },
      data: {
        activeAppMode: input.mode,
      },
      select: profileSelection,
    });

    return this.toGraphqlProfile(profile);
  }

  async updateDriverPresence(
    profileId: string,
    input: UpdateDriverPresenceInput,
  ): Promise<DriverPresenceRecord> {
    if (input.isOnline && (input.lat == null || input.lng == null)) {
      throw new BadRequestException(
        'Latitude and longitude are required when going online.',
      );
    }

    const presence = await this.prisma.$transaction(async (tx) => {
      const driverProfile = await tx.driverProfile.findUnique({
        where: { profileId },
        select: {
          id: true,
          providerId: true,
          onboardingStatus: true,
        },
      });

      if (!driverProfile) {
        throw new ForbiddenException('Driver profile not found for this account.');
      }

      if (driverProfile.onboardingStatus !== DriverOnboardingStatus.APPROVED) {
        throw new ForbiddenException(
          'Only approved drivers can update live presence.',
        );
      }

      const heartbeatAt = new Date();
      const recordedAt = input.recordedAt
        ? new Date(input.recordedAt)
        : heartbeatAt;

      const nextPresence = await tx.driverPresence.upsert({
        where: {
          driverProfileId: driverProfile.id,
        },
        update: {
          source: 'gps',
          isOnline: input.isOnline,
          lat: input.lat ?? null,
          lng: input.lng ?? null,
          accuracyMeters: input.accuracyMeters ?? null,
          heading: input.heading ?? null,
          speedKph: input.speedKph ?? null,
          recordedAt,
          lastHeartbeatAt: heartbeatAt,
        },
        create: {
          driverProfileId: driverProfile.id,
          source: 'gps',
          isOnline: input.isOnline,
          lat: input.lat ?? null,
          lng: input.lng ?? null,
          accuracyMeters: input.accuracyMeters ?? null,
          heading: input.heading ?? null,
          speedKph: input.speedKph ?? null,
          recordedAt,
          lastHeartbeatAt: heartbeatAt,
        },
        select: driverPresenceSelection,
      });

      if (driverProfile.providerId) {
        await tx.provider.update({
          where: { id: driverProfile.providerId },
          data: {
            isAvailable: input.isOnline,
            availabilityUpdatedAt: heartbeatAt,
          },
        });
      }

      return nextPresence;
    });

    return this.toGraphqlDriverPresence(presence);
  }

  async myNotificationInbox(
    profileId: string,
    take?: number,
  ): Promise<NotificationInboxItem[]> {
    const items = await this.prisma.notification.findMany({
      where: {
        recipientProfileId: profileId,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: Math.min(Math.max(take ?? 50, 1), 100),
    });

    return items.map((item) => this.toGraphqlNotificationInboxItem(item));
  }

  async markNotificationRead(
    profileId: string,
    notificationId: string,
  ): Promise<NotificationInboxItem> {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        recipientProfileId: profileId,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    const updated = await this.prisma.notification.update({
      where: { id: notification.id },
      data: {
        isRead: true,
        readAt: notification.readAt ?? new Date(),
      },
    });

    return this.toGraphqlNotificationInboxItem(updated);
  }

  async markAllNotificationsRead(profileId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        recipientProfileId: profileId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return result.count;
  }

  async completeDriverRegistration(
    profileId: string,
    input: CompleteDriverRegistrationInput,
  ): Promise<Profile> {
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const vehicleCategory = mapDriverTypeToVehicleCategory(input.driverType);
    if (!vehicleCategory) {
      throw new BadRequestException('Driver type is invalid');
    }

    const normalizedFirstName = input.firstName.trim();
    const normalizedLastName = input.lastName.trim();
    const businessName = `${normalizedFirstName} ${normalizedLastName}`.trim();
    const nextRole =
      input.role ??
      (input.driverType === 'bike'
        ? UserRole.RIDER
        : input.driverType === 'van'
          ? UserRole.VAN_DRIVER
          : UserRole.TRUCK_DRIVER);
    const expectedRole =
      input.driverType === 'bike'
        ? UserRole.RIDER
        : input.driverType === 'van'
          ? UserRole.VAN_DRIVER
          : UserRole.TRUCK_DRIVER;

    if (!isDriverRole(nextRole) || nextRole !== expectedRole) {
      throw new BadRequestException('Driver role must match the vehicle type');
    }

    if (profile.role === UserRole.SHIPPER || profile.role === UserRole.ADMIN) {
      throw new ForbiddenException(
        'This account cannot be converted into a driver account.',
      );
    }

    const updatedProfile = await this.prisma.$transaction(async (tx) => {
      await tx.profile.update({
        where: { id: profileId },
        data: {
          firstName: normalizedFirstName,
          lastName: normalizedLastName,
          role: nextRole,
          activeAppMode: AppMode.DRIVER,
        },
      });

      const providerId = await this.ensureProviderForProfile(
        tx,
        {
          id: profile.id,
          email: profile.email,
          firstName: normalizedFirstName,
          lastName: normalizedLastName,
        },
        businessName,
        {
          driverType: vehicleCategory,
          isAvailable: input.isAvailable,
        },
      );

      const existingVehicle = await tx.vehicle.findUnique({
        where: {
          providerId,
        },
        select: {
          id: true,
        },
      });

      const normalizedPlateNumber = input.plateNumber.trim().toUpperCase();

      if (existingVehicle) {
        await tx.vehicle.update({
          where: {
            id: existingVehicle.id,
          },
          data: {
            category: vehicleCategory,
            plateNumber: normalizedPlateNumber,
            capacityKg: input.capacityKg,
            status: 'active',
          },
        });
      } else {
        await tx.vehicle.create({
          data: {
            providerId,
            category: vehicleCategory,
            plateNumber: normalizedPlateNumber,
            capacityKg: input.capacityKg,
            status: 'active',
          },
        });
      }

      await tx.driverProfile.upsert({
        where: { profileId },
        update: {
          providerId,
          onboardingStatus: DriverOnboardingStatus.APPROVED,
          driverType: vehicleCategory,
          legalFirstName: normalizedFirstName,
          legalLastName: normalizedLastName,
          canDispatch: true,
          canFreight: input.driverType !== DriverType.BIKE,
          submittedAt: new Date(),
          reviewedAt: new Date(),
          approvedAt: new Date(),
          rejectionReason: null,
        },
        create: {
          profileId,
          providerId,
          onboardingStatus: DriverOnboardingStatus.APPROVED,
          driverType: vehicleCategory,
          legalFirstName: normalizedFirstName,
          legalLastName: normalizedLastName,
          canDispatch: true,
          canFreight: input.driverType !== DriverType.BIKE,
          submittedAt: new Date(),
          reviewedAt: new Date(),
          approvedAt: new Date(),
        },
      });

      return tx.profile.findUniqueOrThrow({
        where: { id: profileId },
        select: profileSelection,
      });
    });

    return this.toGraphqlProfile(updatedProfile);
  }

  async setProviderAvailability(
    profileId: string,
    input: SetProviderAvailabilityInput,
  ): Promise<Profile> {
    await this.assertDriverOnboardingComplete(profileId);

    const ownerProvider = await this.prisma.provider.findFirst({
      where: {
        profileId,
      },
      select: {
        id: true,
      },
    });

    const ownerMembership = await this.prisma.providerMember.findFirst({
      where: {
        profileId,
        status: 'active',
        role: 'owner',
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        providerId: true,
      },
    });

    const providerId = ownerProvider?.id ?? ownerMembership?.providerId;
    if (!providerId) {
      throw new ForbiddenException(
        'Only provider owners can update provider availability',
      );
    }

    await this.prisma.provider.update({
      where: {
        id: providerId,
      },
      data: {
        isAvailable: input.isAvailable,
        availabilityUpdatedAt: new Date(),
      },
    });

    const profile = await this.findProfileById(profileId);
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return profile;
  }

  async getNotificationSettings(
    profileId: string,
  ): Promise<NotificationSettings> {
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      select: {
        notificationsEnabled: true,
        notificationPromptedAt: true,
        pushPermissionGranted: true,
        pushPermissionStatus: true,
        pushDevices: {
          where: {
            isActive: true,
          },
          orderBy: {
            lastSeenAt: 'desc',
          },
          take: 1,
          select: {
            lastSeenAt: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return {
      notificationsEnabled: profile.notificationsEnabled,
      notificationPromptedAt: profile.notificationPromptedAt,
      pushPermissionGranted: profile.pushPermissionGranted,
      pushPermissionStatus: profile.pushPermissionStatus,
      hasActivePushDevice: profile.pushDevices.length > 0,
      lastPushDeviceSeenAt: profile.pushDevices[0]?.lastSeenAt ?? null,
    };
  }

  async updateNotificationSettings(
    profileId: string,
    input: UpdateNotificationSettingsInput,
  ): Promise<NotificationSettings> {
    const data: Prisma.ProfileUpdateInput = {};

    if (typeof input.notificationsEnabled === 'boolean') {
      data.notificationsEnabled = input.notificationsEnabled;
    }

    if (typeof input.pushPermissionGranted === 'boolean') {
      data.pushPermissionGranted = input.pushPermissionGranted;
    }

    if (input.pushPermissionStatus !== undefined) {
      data.pushPermissionStatus = input.pushPermissionStatus?.trim() || null;

      if (input.pushPermissionGranted === undefined) {
        data.pushPermissionGranted = input.pushPermissionStatus === 'granted';
      }
    }

    if (input.markPrompted) {
      data.notificationPromptedAt = new Date();
    }

    await this.prisma.profile.update({
      where: { id: profileId },
      data,
    });

    return this.getNotificationSettings(profileId);
  }

  async upsertPushDevice(
    profileId: string,
    input: UpsertPushDeviceInput,
  ): Promise<PushDevice> {
    const nextPermissionStatus = input.pushPermissionStatus?.trim() || null;

    await this.prisma.profile.update({
      where: { id: profileId },
      data: {
        pushPermissionStatus: nextPermissionStatus,
        pushPermissionGranted:
          nextPermissionStatus != null
            ? nextPermissionStatus === 'granted'
            : undefined,
        notificationPromptedAt:
          nextPermissionStatus != null ? new Date() : undefined,
      },
    });

    return this.prisma.pushDevice.upsert({
      where: { expoPushToken: input.expoPushToken },
      update: {
        profileId,
        deviceId: input.deviceId?.trim() || null,
        platform: input.platform?.trim() || null,
        appVersion: input.appVersion?.trim() || null,
        pushPermissionStatus: nextPermissionStatus,
        isActive: input.isActive ?? true,
        lastSeenAt: new Date(),
      },
      create: {
        profileId,
        expoPushToken: input.expoPushToken,
        deviceId: input.deviceId?.trim() || null,
        platform: input.platform?.trim() || null,
        appVersion: input.appVersion?.trim() || null,
        pushPermissionStatus: nextPermissionStatus,
        isActive: input.isActive ?? true,
      },
    });
  }

  private async ensureDraftDriverProfile(
    tx: Prisma.TransactionClient,
    profileId: string,
  ): Promise<{ id: string; onboardingStatus: DriverOnboardingStatus }> {
    const profile = await tx.profile.findUnique({
      where: { id: profileId },
      select: { id: true },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return tx.driverProfile.upsert({
      where: { profileId },
      update: {},
      create: {
        profileId,
        onboardingStatus: DriverOnboardingStatus.DRAFT,
      },
      select: {
        id: true,
        onboardingStatus: true,
      },
    });
  }

  private buildDriverDraftUpdate(
    currentStatus: DriverOnboardingStatus,
  ): Prisma.DriverProfileUpdateInput {
    if (currentStatus === DriverOnboardingStatus.APPROVED) {
      return {};
    }

    return {
      onboardingStatus: DriverOnboardingStatus.DRAFT,
      rejectionReason: null,
      submittedAt: null,
      reviewedAt: null,
      approvedAt: null,
      canDispatch: false,
      canFreight: false,
    };
  }

  private assertDriverOnboardingSubmissionReady(
    driverProfile: DriverProfileDbRecord,
  ): void {
    if (
      !driverProfile.driverType ||
      !driverProfile.legalFirstName?.trim() ||
      !driverProfile.legalLastName?.trim() ||
      !driverProfile.dateOfBirth ||
      !driverProfile.licenseNumber?.trim() ||
      !driverProfile.licenseExpiryAt ||
      !driverProfile.identityType?.trim() ||
      !driverProfile.identityNumber?.trim()
    ) {
      throw new BadRequestException(
        'Complete driver personal and identity information before submitting.',
      );
    }

    if (
      !driverProfile.vehicle ||
      !driverProfile.vehicle.category ||
      !driverProfile.vehicle.plateNumber?.trim() ||
      !driverProfile.vehicle.capacityKg
    ) {
      throw new BadRequestException(
        'Complete vehicle information before submitting driver onboarding.',
      );
    }

    const uploadedDocumentTypes = new Set(
      driverProfile.complianceDocuments.map((document) => document.type),
    );
    const hasSelfie =
      Boolean(driverProfile.selfieStoragePath?.trim()) ||
      uploadedDocumentTypes.has(DriverComplianceDocumentType.SELFIE);
    const hasLicense = uploadedDocumentTypes.has(
      DriverComplianceDocumentType.DRIVER_LICENSE,
    );
    const hasIdentity =
      uploadedDocumentTypes.has(
        DriverComplianceDocumentType.IDENTITY_DOCUMENT,
      ) || uploadedDocumentTypes.has(DriverComplianceDocumentType.NIN);
    const hasVehicleRegistration = uploadedDocumentTypes.has(
      DriverComplianceDocumentType.VEHICLE_REGISTRATION,
    );

    if (!hasSelfie || !hasLicense || !hasIdentity || !hasVehicleRegistration) {
      throw new BadRequestException(
        'Upload selfie, license, identity, and vehicle registration documents before submitting.',
      );
    }
  }

  private buildDriverOnboardingSnapshot(
    driverProfile: DriverProfileDbRecord,
  ): Prisma.InputJsonValue {
    return {
      id: driverProfile.id,
      onboardingStatus: driverProfile.onboardingStatus,
      driverType: driverProfile.driverType,
      legalFirstName: driverProfile.legalFirstName,
      legalLastName: driverProfile.legalLastName,
      dateOfBirth: driverProfile.dateOfBirth?.toISOString() ?? null,
      licenseNumber: driverProfile.licenseNumber,
      licenseExpiryAt: driverProfile.licenseExpiryAt?.toISOString() ?? null,
      identityType: driverProfile.identityType,
      identityNumber: driverProfile.identityNumber,
      insurancePolicyNumber: driverProfile.insurancePolicyNumber,
      selfieStorageBucket: driverProfile.selfieStorageBucket,
      selfieStoragePath: driverProfile.selfieStoragePath,
      vehicle: driverProfile.vehicle
        ? {
            category: driverProfile.vehicle.category,
            plateNumber: driverProfile.vehicle.plateNumber,
            vin: driverProfile.vehicle.vin,
            make: driverProfile.vehicle.make,
            model: driverProfile.vehicle.model,
            color: driverProfile.vehicle.color,
            capacityKg: driverProfile.vehicle.capacityKg,
            capacityVolumeCm3:
              driverProfile.vehicle.capacityVolumeCm3?.toString() ?? null,
          }
        : null,
      complianceDocuments: driverProfile.complianceDocuments.map((document) => ({
        id: document.id,
        type: document.type,
        status: document.status,
        storageBucket: document.storageBucket,
        storagePath: document.storagePath,
        mimeType: document.mimeType,
        notes: document.notes,
        uploadedAt: document.uploadedAt.toISOString(),
      })),
    };
  }

  private async syncOperationalProviderFromDriverProfile(
    tx: Prisma.TransactionClient,
    driverProfile: DriverProfileDbRecord,
  ): Promise<string> {
    if (!driverProfile.driverType || !driverProfile.vehicle) {
      throw new BadRequestException(
        'Driver onboarding is missing required vehicle details.',
      );
    }

    const profile = await tx.profile.findUnique({
      where: { id: driverProfile.profileId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const providerId = await this.ensureProviderForProfile(
      tx,
      {
        id: profile.id,
        email: profile.email,
        firstName: driverProfile.legalFirstName ?? profile.firstName,
        lastName: driverProfile.legalLastName ?? profile.lastName,
      },
      `${driverProfile.legalFirstName ?? profile.firstName ?? ''} ${driverProfile.legalLastName ?? profile.lastName ?? ''}`.trim(),
      {
        driverType: driverProfile.driverType as PrismaVehicleCategory,
        isAvailable: false,
      },
    );

    await tx.vehicle.upsert({
      where: { providerId },
      update: {
        category: driverProfile.vehicle.category,
        plateNumber: driverProfile.vehicle.plateNumber?.trim().toUpperCase() || null,
        vin: driverProfile.vehicle.vin?.trim() || null,
        make: driverProfile.vehicle.make?.trim() || null,
        model: driverProfile.vehicle.model?.trim() || null,
        color: driverProfile.vehicle.color?.trim() || null,
        capacityKg: driverProfile.vehicle.capacityKg ?? null,
        capacityVolumeCm3: driverProfile.vehicle.capacityVolumeCm3 ?? null,
        status: 'active',
      },
      create: {
        providerId,
        category: driverProfile.vehicle.category,
        plateNumber: driverProfile.vehicle.plateNumber?.trim().toUpperCase() || null,
        vin: driverProfile.vehicle.vin?.trim() || null,
        make: driverProfile.vehicle.make?.trim() || null,
        model: driverProfile.vehicle.model?.trim() || null,
        color: driverProfile.vehicle.color?.trim() || null,
        capacityKg: driverProfile.vehicle.capacityKg ?? null,
        capacityVolumeCm3: driverProfile.vehicle.capacityVolumeCm3 ?? null,
        status: 'active',
      },
    });

    return providerId;
  }

  private toGraphqlDriverProfile(
    driverProfile: DriverProfileDbRecord,
  ): DriverProfileRecord {
    return {
      id: driverProfile.id,
      providerId: driverProfile.providerId ?? null,
      onboardingStatus: driverProfile.onboardingStatus,
      driverType: normalizeDriverType(driverProfile.driverType),
      legalFirstName: driverProfile.legalFirstName ?? null,
      legalLastName: driverProfile.legalLastName ?? null,
      dateOfBirth: driverProfile.dateOfBirth ?? null,
      selfieStorageBucket: driverProfile.selfieStorageBucket ?? null,
      selfieStoragePath: driverProfile.selfieStoragePath ?? null,
      licenseNumber: driverProfile.licenseNumber ?? null,
      licenseExpiryAt: driverProfile.licenseExpiryAt ?? null,
      identityType: driverProfile.identityType ?? null,
      identityNumber: driverProfile.identityNumber ?? null,
      insurancePolicyNumber: driverProfile.insurancePolicyNumber ?? null,
      rejectionReason: driverProfile.rejectionReason ?? null,
      capabilities: this.resolveDriverCapabilities(driverProfile),
      canDispatch: driverProfile.canDispatch,
      canFreight: driverProfile.canFreight,
      submittedAt: driverProfile.submittedAt ?? null,
      reviewedAt: driverProfile.reviewedAt ?? null,
      approvedAt: driverProfile.approvedAt ?? null,
      vehicle: driverProfile.vehicle
        ? {
            id: driverProfile.vehicle.id,
            category: driverProfile.vehicle.category,
            plateNumber: driverProfile.vehicle.plateNumber ?? null,
            vin: driverProfile.vehicle.vin ?? null,
            make: driverProfile.vehicle.make ?? null,
            model: driverProfile.vehicle.model ?? null,
            color: driverProfile.vehicle.color ?? null,
            capacityKg: driverProfile.vehicle.capacityKg ?? null,
            capacityVolumeCm3: driverProfile.vehicle.capacityVolumeCm3 ?? null,
            createdAt: driverProfile.vehicle.createdAt,
            updatedAt: driverProfile.vehicle.updatedAt,
          }
        : null,
      complianceDocuments: driverProfile.complianceDocuments.map((document) => ({
        id: document.id,
        type: document.type,
        status: document.status,
        storageBucket: document.storageBucket,
        storagePath: document.storagePath,
        mimeType: document.mimeType ?? null,
        notes: document.notes ?? null,
        uploadedAt: document.uploadedAt,
        reviewedAt: document.reviewedAt ?? null,
      })),
      submissions: driverProfile.submissions.map((submission) => ({
        id: submission.id,
        status: submission.status,
        rejectionReason: submission.rejectionReason ?? null,
        reviewerId: submission.reviewerId ?? null,
        snapshot:
          submission.snapshot &&
          typeof submission.snapshot === 'object' &&
          !Array.isArray(submission.snapshot)
            ? (submission.snapshot as Record<string, unknown>)
            : null,
        submittedAt: submission.submittedAt,
        reviewedAt: submission.reviewedAt ?? null,
      })),
      presence: driverProfile.presence
        ? this.toGraphqlDriverPresence(driverProfile.presence)
        : null,
      createdAt: driverProfile.createdAt,
      updatedAt: driverProfile.updatedAt,
    };
  }

  private toGraphqlDriverPresence(
    presence: Prisma.DriverPresenceGetPayload<{
      select: typeof driverPresenceSelection;
    }>,
  ): DriverPresenceRecord {
    return {
      id: presence.id,
      isOnline: presence.isOnline,
      lat: presence.lat ?? null,
      lng: presence.lng ?? null,
      accuracyMeters: presence.accuracyMeters ?? null,
      heading: presence.heading ?? null,
      speedKph: presence.speedKph ?? null,
      recordedAt: presence.recordedAt ?? null,
      lastHeartbeatAt: presence.lastHeartbeatAt ?? null,
      updatedAt: presence.updatedAt,
    };
  }

  private toGraphqlNotificationInboxItem(notification: {
    id: string;
    category: string;
    title: string;
    body: string;
    entityType: string | null;
    entityId: string | null;
    metadata: Prisma.JsonValue | null;
    isRead: boolean;
    readAt: Date | null;
    createdAt: Date;
  }): NotificationInboxItem {
    return {
      id: notification.id,
      category: notification.category as NotificationCategory,
      title: notification.title,
      body: notification.body,
      entityType: notification.entityType ?? null,
      entityId: notification.entityId ?? null,
      metadata:
        notification.metadata &&
        typeof notification.metadata === 'object' &&
        !Array.isArray(notification.metadata)
          ? (notification.metadata as Record<string, unknown>)
          : null,
      isRead: notification.isRead,
      readAt: notification.readAt ?? null,
      createdAt: notification.createdAt,
    };
  }

  private async ensureProviderForProfile(
    tx: Prisma.TransactionClient,
    profile: {
      id: string;
      email: string | null;
      firstName: string | null;
      lastName: string | null;
    },
    businessName?: string,
    options?: {
      driverType?: PrismaVehicleCategory | null;
      isAvailable?: boolean;
    },
  ): Promise<string> {
    const providerUpdateData: Prisma.ProviderUpdateInput = {
      businessName: businessName?.trim() || undefined,
      driverType: options?.driverType ?? undefined,
      isAvailable: options?.isAvailable ?? undefined,
      availabilityUpdatedAt:
        typeof options?.isAvailable === 'boolean' ? new Date() : undefined,
    };

    const existingMembership = await tx.providerMember.findFirst({
      where: {
        profileId: profile.id,
      },
      select: {
        providerId: true,
      },
    });

    if (existingMembership) {
      await tx.providerMember.upsert({
        where: {
          providerId_profileId: {
            providerId: existingMembership.providerId,
            profileId: profile.id,
          },
        },
        create: {
          providerId: existingMembership.providerId,
          profileId: profile.id,
          role: 'owner',
          status: 'active',
        },
        update: {
          role: 'owner',
          status: 'active',
        },
      });

      await tx.provider.updateMany({
        where: {
          id: existingMembership.providerId,
        },
        data: {
          profileId: profile.id,
          ...providerUpdateData,
        },
      });
      return existingMembership.providerId;
    }

    const existingProvider = await tx.provider.findUnique({
      where: {
        profileId: profile.id,
      },
      select: {
        id: true,
      },
    });

    if (existingProvider) {
      await tx.providerMember.upsert({
        where: {
          providerId_profileId: {
            providerId: existingProvider.id,
            profileId: profile.id,
          },
        },
        create: {
          providerId: existingProvider.id,
          profileId: profile.id,
          role: 'owner',
          status: 'active',
        },
        update: {
          role: 'owner',
          status: 'active',
        },
      });

      await tx.provider.update({
        where: {
          id: existingProvider.id,
        },
        data: providerUpdateData,
      });

      return existingProvider.id;
    }

    const fallbackBusinessName = this.getDefaultBusinessName(profile);
    const provider = await tx.provider.create({
      data: {
        businessName: businessName?.trim() || fallbackBusinessName,
        driverType: options?.driverType ?? undefined,
        profileId: profile.id,
        status: 'pending',
        isAvailable: options?.isAvailable ?? false,
        availabilityUpdatedAt:
          typeof options?.isAvailable === 'boolean' ? new Date() : undefined,
      },
      select: {
        id: true,
      },
    });

    await tx.providerMember.create({
      data: {
        providerId: provider.id,
        profileId: profile.id,
        role: 'owner',
        status: 'active',
      },
    });

    return provider.id;
  }

  private async resolveProfileImageUrl(
    profile: Pick<ProfileRecord, 'profileImageBucket' | 'profileImagePath'>,
  ): Promise<string | null> {
    if (!profile.profileImageBucket || !profile.profileImagePath) {
      return null;
    }

    const expiresInSeconds = Math.max(
      Number(
        this.configService.get<string>('PROFILE_IMAGE_URL_TTL_SECONDS') ??
          604800,
      ),
      300,
    );

    return this.googleStorageService.createSignedReadUrl({
      bucketName: profile.profileImageBucket,
      objectPath: profile.profileImagePath,
      expiresInSeconds,
    });
  }

  private getProfileImageBucketName(): string {
    return (
      this.configService.get<string>('STORAGE_BUCKET_NAME')?.trim() ||
      'oyana-storage'
    );
  }

  private buildProfileImageStoragePath(
    profileId: string,
    rawFileName: string,
  ): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const cleanFileName = this.sanitizeUploadFileName(rawFileName);
    const random = Math.random().toString(36).slice(2, 10);

    return `profiles/${profileId}/${year}/${month}/${Date.now()}-${random}-${cleanFileName}`;
  }

  private buildDriverDocumentStoragePath(
    profileId: string,
    documentType: string,
    rawFileName: string,
  ): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const cleanFileName = this.sanitizeUploadFileName(rawFileName);
    const cleanType = documentType.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const random = Math.random().toString(36).slice(2, 10);

    return `drivers/${profileId}/${cleanType}/${year}/${month}/${Date.now()}-${random}-${cleanFileName}`;
  }

  private sanitizeUploadFileName(fileName: string): string {
    const trimmed = fileName.trim();
    if (!trimmed) {
      return 'profile-image.jpg';
    }

    const nameOnly = trimmed.replace(/[/\\]/g, '_');
    const asciiOnly = nameOnly.replace(/[^a-zA-Z0-9._-]/g, '_');

    return asciiOnly.length > 0 ? asciiOnly.slice(-120) : 'profile-image.jpg';
  }

  private getDefaultBusinessName(profile: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  }): string {
    const fullName = [profile.firstName, profile.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();

    if (fullName.length > 0) {
      return fullName;
    }

    const emailPrefix = profile.email?.split('@')[0]?.trim();
    if (emailPrefix) {
      const normalized =
        emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
      return normalized;
    }

    return 'New Driver';
  }
}
