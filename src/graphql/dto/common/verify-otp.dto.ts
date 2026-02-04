import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class VerifyOTPDto {
  @Field()
  phoneNumber: string;

  @Field()
  otpCode: string;
}
