import { InputType, Field, Int } from '@nestjs/graphql';
import { GraphQLBigInt } from '../../scalars';
import {
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
  DriverType,
  PreferredLanguage,
  UserRole,
  UserStatus,
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
