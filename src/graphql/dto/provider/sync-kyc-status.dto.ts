import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

@InputType()
export class SyncKycStatusDto {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  providerId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  checkId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  vendorReference?: string;
}

@InputType()
export class MyKycChecksFilterDto {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  checkType?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  status?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}
