import { Field, InputType } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

@InputType()
export class StartPhoneVerificationDto {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  providerId?: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @Matches(/^[+]?\d{10,16}$/)
  phoneNumber: string;
}
