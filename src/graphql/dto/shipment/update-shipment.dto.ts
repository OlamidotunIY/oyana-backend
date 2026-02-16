import { InputType, Field } from '@nestjs/graphql';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import {
  ShipmentMode,
  ShipmentScheduleType,
  ShipmentStatus,
  VehicleCategory,
} from '../../enums';
import { GraphQLBigInt } from '../../scalars';

@InputType()
export class UpdateShipmentDto {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  trackingCode?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  customerProfileId?: string;

  @Field(() => ShipmentMode, { nullable: true })
  @IsOptional()
  @IsEnum(ShipmentMode)
  mode?: ShipmentMode;

  @Field(() => VehicleCategory, { nullable: true })
  @IsOptional()
  @IsEnum(VehicleCategory)
  vehicleCategory?: VehicleCategory;

  @Field(() => ShipmentScheduleType, { nullable: true })
  @IsOptional()
  @IsEnum(ShipmentScheduleType)
  scheduleType?: ShipmentScheduleType;

  @Field(() => ShipmentStatus, { nullable: true })
  @IsOptional()
  @IsEnum(ShipmentStatus)
  status?: ShipmentStatus;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  pickupAddressId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  dropoffAddressId?: string;

  @Field({ nullable: true })
  @IsOptional()
  scheduledAt?: Date;

  @Field(() => GraphQLBigInt, { nullable: true })
  @IsOptional()
  packageValueMinor?: bigint;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  packageDescription?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  specialInstructions?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  requiresEscrow?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{3}$/, {
    message: 'pricingCurrency must be a 3-letter ISO code',
  })
  pricingCurrency?: string;

  @Field(() => GraphQLBigInt, { nullable: true })
  @IsOptional()
  quotedPriceMinor?: bigint;

  @Field(() => GraphQLBigInt, { nullable: true })
  @IsOptional()
  finalPriceMinor?: bigint;

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  commissionRateBps?: number;

  @Field(() => GraphQLBigInt, { nullable: true })
  @IsOptional()
  commissionAmountMinor?: bigint;

  @Field({ nullable: true })
  @IsOptional()
  cancelledAt?: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  cancelledByProfileId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  cancellationReason?: string;
}
