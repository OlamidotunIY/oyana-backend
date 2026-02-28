import { Field, InputType } from '@nestjs/graphql';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
  ValidateIf,
  IsArray,
} from 'class-validator';
import { UserType, State } from '../../enums';

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

  // Common fields for both individual and business
  @Field()
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @Field(() => State)
  @IsEnum(State)
  state: State;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  referralCode?: string;

  // Business-specific fields
  @Field({ nullable: true })
  @ValidateIf((o: SignUpInput) =>
    (o.roles ?? [UserType.INDIVIDUAL]).includes(UserType.BUSINESS),
  )
  @IsNotEmpty()
  @IsString()
  phoneNumber?: string;

  @Field({ nullable: true })
  @ValidateIf((o: SignUpInput) =>
    (o.roles ?? [UserType.INDIVIDUAL]).includes(UserType.BUSINESS),
  )
  @IsNotEmpty()
  @IsString()
  businessName?: string;

  @Field({ nullable: true })
  @ValidateIf((o: SignUpInput) =>
    (o.roles ?? [UserType.INDIVIDUAL]).includes(UserType.BUSINESS),
  )
  @IsNotEmpty()
  @IsString()
  businessAddress?: string;
}
