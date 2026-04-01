import { Int, ObjectType, Field, ID } from '@nestjs/graphql';
import {
  AccountRole,
  AppMode,
  DriverCapability,
  DriverType,
  DriverOnboardingStatus,
  OnboardingStep,
  ProfileStatus,
  PreferredLanguage,
  PublicRole,
  UserRole,
  State,
} from '../../enums';
import { GraphQLBigInt } from '../../scalars';

@ObjectType()
export class Profile {
  @Field(() => ID)
  id: string;

  @Field(() => String, { nullable: true })
  email: string | null;

  @Field(() => Boolean)
  emailVerified: boolean;

  @Field(() => Date, { nullable: true })
  emailVerifiedAt: Date | null;

  @Field(() => UserRole, { nullable: true })
  role: UserRole | null;

  @Field(() => AccountRole)
  accountRole: AccountRole;

  @Field(() => [AppMode])
  availableModes: AppMode[];

  @Field(() => AppMode)
  currentMode: AppMode;

  @Field(() => String, { nullable: true })
  firstName: string | null;

  @Field(() => String, { nullable: true })
  lastName: string | null;

  @Field(() => String, { nullable: true })
  phoneE164: string | null;

  @Field(() => String, { nullable: true })
  profileImageUrl?: string | null;

  @Field(() => Boolean)
  phoneVerified: boolean;

  @Field(() => Date, { nullable: true })
  phoneVerifiedAt: Date | null;

  @Field(() => State, { nullable: true })
  state: State | null;

  @Field(() => String, { nullable: true })
  referralCode: string | null;

  @Field(() => Boolean)
  notificationsEnabled: boolean;

  @Field(() => Date, { nullable: true })
  notificationPromptedAt: Date | null;

  @Field(() => Boolean)
  pushPermissionGranted: boolean;

  @Field(() => String, { nullable: true })
  pushPermissionStatus: string | null;

  @Field(() => String, { nullable: true })
  businessName?: string | null;

  @Field(() => PublicRole)
  publicRole: PublicRole;

  @Field(() => DriverType, { nullable: true })
  driverType?: DriverType | null;

  @Field(() => String, { nullable: true })
  driverProfileId?: string | null;

  @Field(() => DriverOnboardingStatus)
  driverOnboardingStatus: DriverOnboardingStatus;

  @Field(() => [DriverCapability])
  driverCapabilities: DriverCapability[];

  @Field(() => String, { nullable: true })
  providerId?: string | null;

  @Field(() => Boolean, { nullable: true })
  providerIsAvailable?: boolean | null;

  @Field(() => Date, { nullable: true })
  providerAvailabilityUpdatedAt?: Date | null;

  @Field(() => String, { nullable: true })
  primaryAddress?: string | null;

  @Field(() => String, { nullable: true })
  city?: string | null;

  @Field(() => String, { nullable: true })
  activeAddressId?: string | null;

  @Field(() => GraphQLBigInt, { nullable: true })
  walletBalanceMinor?: bigint | null;

  @Field(() => GraphQLBigInt, { nullable: true })
  walletEscrowMinor?: bigint | null;

  @Field(() => String, { nullable: true })
  walletCurrency?: string | null;

  @Field(() => Int)
  unreadNotificationCount: number;

  @Field(() => OnboardingStep)
  onboardingStep: OnboardingStep;

  @Field(() => Boolean)
  onboardingCompleted: boolean;

  @Field(() => PreferredLanguage)
  preferredLanguage: PreferredLanguage;

  @Field(() => ProfileStatus)
  status: ProfileStatus;

  @Field(() => Date, { nullable: true })
  lastLoginAt: Date | null;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType()
export class ProfileImageUploadUrl {
  @Field()
  storageBucket: string;

  @Field()
  storagePath: string;

  @Field()
  uploadUrl: string;

  @Field()
  expiresAt: Date;
}
