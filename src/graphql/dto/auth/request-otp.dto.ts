import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsEnum } from 'class-validator';
import { OtpMode } from '../../enums';

@InputType()
export class RequestOtpInput {
  @Field()
  @IsEmail()
  email: string;

  @Field(() => String)
  @IsEnum(OtpMode)
  mode: OtpMode;
}
