import { Field, InputType, Int } from '@nestjs/graphql';
import { IsArray, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { VehicleCategory } from '../../enums';

@InputType()
export class MarketplaceShipmentsFilterDto {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  routeQuery?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  cargoQuery?: string;

  @Field({ nullable: true })
  @IsOptional()
  scheduledFrom?: Date;

  @Field({ nullable: true })
  @IsOptional()
  scheduledTo?: Date;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  distanceKmMax?: number;

  @Field(() => [VehicleCategory], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsEnum(VehicleCategory, { each: true })
  vehicleCategories?: VehicleCategory[];

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  cursor?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  take?: number;
}
