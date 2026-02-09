import { InputType, Field } from '@nestjs/graphql';
import {
  IsUUID,
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
  IsEnum,
} from 'class-validator';
import { PreferredLanguage, UserStatus } from '../../enums';

@InputType()
export class CreateProfileInput {
  @Field()
  @IsUUID('4', { message: 'authUserId must be a valid UUID' })
  authUserId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Full name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Full name must not exceed 100 characters' })
  fullName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Display name must be at least 2 characters long' })
  @MaxLength(50, { message: 'Display name must not exceed 50 characters' })
  displayName?: string;

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
  @MinLength(2, { message: 'Full name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Full name must not exceed 100 characters' })
  fullName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Display name must be at least 2 characters long' })
  @MaxLength(50, { message: 'Display name must not exceed 50 characters' })
  displayName?: string;

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
