import { ObjectType, Field, ID } from '@nestjs/graphql';
import { OTPPurpose } from '../../enums';

@ObjectType()
export class OTP {
  @Field(() => ID)
  id: string;

  @Field()
  phoneNumber: string;

  @Field()
  otpCode: string;

  @Field(() => OTPPurpose)
  purpose: OTPPurpose;

  @Field()
  isVerified: boolean;

  @Field()
  expiresAt: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
