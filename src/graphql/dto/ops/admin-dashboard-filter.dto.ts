import { Field, InputType, Int } from '@nestjs/graphql';
import { AdminDashboardInterval, ShipmentMode } from '../../enums';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

@InputType()
export class AdminDashboardFilterDto {
  @Field({ nullable: true })
  @IsOptional()
  from?: Date;

  @Field({ nullable: true })
  @IsOptional()
  to?: Date;

  @Field(() => AdminDashboardInterval, { nullable: true })
  @IsOptional()
  @IsEnum(AdminDashboardInterval)
  interval?: AdminDashboardInterval;

  @Field(() => ShipmentMode, { nullable: true })
  @IsOptional()
  @IsEnum(ShipmentMode)
  shipmentMode?: ShipmentMode;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  fleetSearch?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  fleetLimit?: number;
}
