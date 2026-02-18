import { Field, InputType } from '@nestjs/graphql';
import { IsString, Length, Matches } from 'class-validator';

@InputType()
export class VerifyPhoneOtpInput {
  @Field()
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format (e.g., +2348012345678)',
  })
  phoneE164: string;

  @Field()
  @IsString()
  @Length(6, 6)
  token: string;
}
