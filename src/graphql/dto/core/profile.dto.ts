import { InputType, Field, Int } from '@nestjs/graphql';
import { GraphQLBigInt } from '../../scalars';
import {
  IsDateString,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  AppMode,
  DriverType,
  DriverComplianceDocumentType,
  DriverOnboardingStatus,
  PreferredLanguage,
  UserRole,
  UserStatus,
  VehicleCategory,
} from '../../enums';

@InputType()
export class CreateProfileInput {
  @Field()
  @IsUUID('4', { message: 'authUserId must be a valid UUID' })
  authUserId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'First name must be at least 2 characters long' })
  @MaxLength(50, { message: 'First name must not exceed 50 characters' })
  firstName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Last name must be at least 2 characters long' })
  @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
  lastName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format (e.g., +1234567890)',
  })
  phoneE164?: string;

  @Field(() => PreferredLanguage, { defaultValue: PreferredLanguage.EN })
  @IsOptional()
  @IsEnum(PreferredLanguage, {
    message: 'Preferred language must be a valid language code',
  })
  preferredLanguage?: PreferredLanguage;
}

@InputType()
export class UpdateProfileInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'First name must be at least 2 characters long' })
  @MaxLength(50, { message: 'First name must not exceed 50 characters' })
  firstName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Last name must be at least 2 characters long' })
  @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
  lastName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format (e.g., +1234567890)',
  })
  phoneE164?: string;

  @Field(() => PreferredLanguage, { nullable: true })
  @IsOptional()
  @IsEnum(PreferredLanguage, {
    message: 'Preferred language must be a valid language code',
  })
  preferredLanguage?: PreferredLanguage;

  @Field(() => UserStatus, { nullable: true })
  @IsOptional()
  @IsEnum(UserStatus, { message: 'Status must be a valid user status' })
  status?: UserStatus;
}

@InputType()
export class CreateProfileImageUploadUrlInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  fileName: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  mimeType?: string;

  @Field(() => GraphQLBigInt, { nullable: true })
  @IsOptional()
  @Min(1)
  sizeBytes?: bigint;
}

@InputType()
export class SetProfileImageInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  storageBucket: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  storagePath: string;
}

@InputType()
export class SetProviderAvailabilityInput {
  @Field(() => Boolean)
  @IsBoolean({ message: 'isAvailable must be a boolean value' })
  isAvailable: boolean;
}

@InputType()
export class CompleteDriverRegistrationInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'First name must be at least 2 characters long' })
  @MaxLength(50, { message: 'First name must not exceed 50 characters' })
  firstName: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Last name must be at least 2 characters long' })
  @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
  lastName: string;

  @Field(() => DriverType)
  @IsEnum(DriverType, { message: 'Driver type must be a valid value' })
  driverType: DriverType;

  @Field(() => UserRole, { nullable: true })
  @IsOptional()
  @IsEnum(UserRole, { message: 'role must be a valid driver role' })
  role?: UserRole;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(24, { message: 'Plate number must not exceed 24 characters' })
  plateNumber: string;

  @Field(() => Int)
  @IsInt({ message: 'capacityKg must be a whole number' })
  @Min(1, { message: 'capacityKg must be greater than zero' })
  capacityKg: number;

  @Field(() => Boolean)
  @IsBoolean({ message: 'isAvailable must be a boolean value' })
  isAvailable: boolean;
}

@InputType()
export class CreateDriverDocumentUploadUrlInput {
  @Field(() => DriverComplianceDocumentType)
  @IsEnum(DriverComplianceDocumentType)
  documentType: DriverComplianceDocumentType;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  fileName: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  mimeType?: string;

  @Field(() => GraphQLBigInt, { nullable: true })
  @IsOptional()
  @Min(1)
  sizeBytes?: bigint;
}

@InputType()
export class SaveDriverPersonalInfoInput {
  @Field(() => DriverType)
  @IsEnum(DriverType)
  driverType: DriverType;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  legalFirstName: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  legalLastName: string;

  @Field()
  @IsDateString()
  dateOfBirth: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  selfieStorageBucket?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  selfieStoragePath?: string;
}

@InputType()
export class SaveDriverIdentityInfoInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  licenseNumber: string;

  @Field()
  @IsDateString()
  licenseExpiryAt: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  identityType: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  identityNumber: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  insurancePolicyNumber?: string;
}

@InputType()
export class SaveDriverVehicleInput {
  @Field(() => VehicleCategory)
  @IsEnum(VehicleCategory)
  category: VehicleCategory;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(24)
  plateNumber: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  vin?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  make?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  model?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(24)
  color?: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  capacityKg: number;

  @Field(() => GraphQLBigInt, { nullable: true })
  @IsOptional()
  @Min(1)
  capacityVolumeCm3?: bigint;
}

@InputType()
export class AddDriverComplianceDocumentInput {
  @Field(() => DriverComplianceDocumentType)
  @IsEnum(DriverComplianceDocumentType)
  documentType: DriverComplianceDocumentType;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  storageBucket: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  storagePath: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  mimeType?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  notes?: string;
}

@InputType()
export class SubmitDriverOnboardingInput {
  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  activateDriverMode?: boolean;
}

@InputType()
export class ReviewDriverOnboardingInput {
  @Field()
  @IsUUID('4')
  driverProfileId: string;

  @Field(() => DriverOnboardingStatus)
  @IsEnum(DriverOnboardingStatus)
  status: DriverOnboardingStatus;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(400)
  rejectionReason?: string;
}

@InputType()
export class SwitchAppModeInput {
  @Field(() => AppMode)
  @IsEnum(AppMode)
  mode: AppMode;
}

@InputType()
export class UpdateDriverPresenceInput {
  @Field(() => Boolean)
  @IsBoolean()
  isOnline: boolean;

  @Field({ nullable: true })
  @IsOptional()
  lat?: number;

  @Field({ nullable: true })
  @IsOptional()
  lng?: number;

  @Field({ nullable: true })
  @IsOptional()
  accuracyMeters?: number;

  @Field({ nullable: true })
  @IsOptional()
  heading?: number;

  @Field({ nullable: true })
  @IsOptional()
  speedKph?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsDateString()
  recordedAt?: string;
}
