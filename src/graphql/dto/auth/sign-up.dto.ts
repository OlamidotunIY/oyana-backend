import { Field, InputType } from '@nestjs/graphql';
import {
  IsEmail,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
  IsArray,
} from 'class-validator';
import { RegistrationIntent, State, UserType } from '../../enums';

@InputType()
export class SignUpInput {
  @Field()
  @IsEmail()
  email: string;

  @Field()
  @IsString()
  @MinLength(6)
  password: string;

  @Field(() => [UserType], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsEnum(UserType, { each: true })
  roles?: UserType[];

  @Field(() => RegistrationIntent, { nullable: true })
  @IsOptional()
  @IsEnum(RegistrationIntent)
  registrationIntent?: RegistrationIntent;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  firstName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  lastName?: string;

  @Field(() => State, { nullable: true })
  @IsOptional()
  @IsEnum(State)
  state?: State;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  referralCode?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  businessName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  businessAddress?: string;
}
