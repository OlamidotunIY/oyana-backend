import { InputType, Field } from '@nestjs/graphql';
import {
  IsDate,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class VerifyNINDto {
  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  kycCaseId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  providerId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^(\d{11}|[a-fA-F0-9]{64})$/)
  ninHash?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  firstName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  lastName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateOfBirth?: Date;
}
