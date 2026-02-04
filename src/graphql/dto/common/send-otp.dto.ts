import { InputType, Field } from '@nestjs/graphql';
import { OTPPurpose } from '../../enums';

@InputType()
export class SendOTPDto {
  @Field()
  phoneNumber: string;

  @Field(() => OTPPurpose)
  purpose: OTPPurpose;
}
