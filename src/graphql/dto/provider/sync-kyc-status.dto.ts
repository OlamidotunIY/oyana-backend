import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

@InputType()
export class SyncKycStatusDto {
  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  providerId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  checkId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  vendorReference?: string;
}

@InputType()
export class MyKycChecksFilterDto {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  checkType?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  status?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}
