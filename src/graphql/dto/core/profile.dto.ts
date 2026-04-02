import { InputType, Field, Int, Float } from '@nestjs/graphql';
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
} from '../../enums';

@InputType()
export class CreateProfileInput {
  @Field()
  @IsUUID('4', { message: 'authUserId must be a valid UUID' })
  authUserId: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'First name must be at least 2 characters long' })
  @MaxLength(50, { message: 'First name must not exceed 50 characters' })
  firstName?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Last name must be at least 2 characters long' })
  @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
  lastName?: string;

  @Field(() => String, { nullable: true })
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
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'First name must be at least 2 characters long' })
  @MaxLength(50, { message: 'First name must not exceed 50 characters' })
  firstName?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Last name must be at least 2 characters long' })
  @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
  lastName?: string;

  @Field(() => String, { nullable: true })
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

  @Field(() => String, { nullable: true })
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
export class CreateDriverDocumentUploadUrlInput {
  @Field(() => DriverComplianceDocumentType)
  @IsEnum(DriverComplianceDocumentType)
  documentType: DriverComplianceDocumentType;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  fileName: string;

  @Field(() => String, { nullable: true })
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

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  selfieStorageBucket?: string;

  @Field(() => String, { nullable: true })
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

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  insurancePolicyNumber?: string;
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

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  mimeType?: string;

  @Field(() => String, { nullable: true })
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

  @Field(() => String, { nullable: true })
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

  @Field(() => Float, { nullable: true })
  @IsOptional()
  lat?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  lng?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  accuracyMeters?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  heading?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  speedKph?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsDateString()
  recordedAt?: string;
}
