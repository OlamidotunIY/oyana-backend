import { Field, InputType } from '@nestjs/graphql';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
  ValidateIf,
} from 'class-validator';
import { UserType } from '../../enums';

@InputType()
export class SignUpInput {
  @Field()
  @IsEmail()
  email: string;

  @Field()
  @IsString()
  @MinLength(6)
  password: string;

  @Field(() => UserType)
  @IsEnum(UserType)
  userType: UserType;

  // Common fields for both individual and business
  @Field()
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  state: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  referralCode?: string;

  // Business-specific fields
  @Field({ nullable: true })
  @ValidateIf((o) => o.userType === UserType.BUSINESS)
  @IsNotEmpty()
  @IsString()
  phoneNumber?: string;

  @Field({ nullable: true })
  @ValidateIf((o) => o.userType === UserType.BUSINESS)
  @IsNotEmpty()
  @IsString()
  businessName?: string;

  @Field({ nullable: true })
  @ValidateIf((o) => o.userType === UserType.BUSINESS)
  @IsNotEmpty()
  @IsString()
  businessAddress?: string;
}
