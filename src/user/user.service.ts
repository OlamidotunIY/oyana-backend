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
  resolveOnboardingStep,
  resolvePublicRole,
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

  private async toGraphqlProfile(profile: ProfileRecord): Promise<Profile> {
    const activeProvider = resolveActiveProvider(profile);
    const profileImageUrl = await this.resolveProfileImageUrl(profile);
    const onboardingStep = resolveOnboardingStep(profile);

    return {
      id: profile.id,
      email: profile.email,
      emailVerified: profile.emailVerified,
      emailVerifiedAt: profile.emailVerifiedAt,
      role: profile.role ?? null,
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
      publicRole: resolvePublicRole(profile),
      driverType: normalizeDriverType(activeProvider?.driverType),
      providerId: activeProvider?.id ?? null,
      providerIsAvailable: activeProvider?.isAvailable ?? null,
      providerAvailabilityUpdatedAt:
        activeProvider?.availabilityUpdatedAt ?? null,
      primaryAddress: profile.activeAddress?.address ?? null,
      city: profile.activeAddress?.city ?? null,
      activeAddressId: profile.activeAddressId ?? null,
      onboardingStep,
      onboardingCompleted: isDriverOnboardingCompleted(profile),
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

    if (!isDriverRole(profile.role ?? null)) {
      throw new ForbiddenException(
        'Only completed driver accounts can access provider operations.',
      );
    }

    const onboardingStep = resolveOnboardingStep(profile);
    if (!isDriverOnboardingCompleted(profile)) {
      throw new ForbiddenException(
        `Complete driver onboarding before accessing provider operations. Next step: ${onboardingStep}.`,
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

  private async ensureProviderForProfile(
    tx: Prisma.TransactionClient,
    profile: {
      id: string;
      email: string;
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
    email: string;
  }): string {
    const fullName = [profile.firstName, profile.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();

    if (fullName.length > 0) {
      return fullName;
    }

    const emailPrefix = profile.email.split('@')[0]?.trim();
    if (emailPrefix) {
      const normalized =
        emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
      return normalized;
    }

    return 'New Driver';
  }
}
