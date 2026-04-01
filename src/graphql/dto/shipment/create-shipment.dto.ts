import { InputType, Field } from '@nestjs/graphql';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import {
  ShipmentMode,
  ShipmentScheduleType,
  VehicleCategory,
} from '../../enums';
import { GraphQLBigInt } from '../../scalars';

@InputType()
export class CreateShipmentDto {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  trackingCode?: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  customerProfileId: string;

  @Field(() => ShipmentMode)
  @IsEnum(ShipmentMode)
  mode: ShipmentMode;

  @Field(() => VehicleCategory)
  @IsEnum(VehicleCategory)
  vehicleCategory: VehicleCategory;

  @Field(() => ShipmentScheduleType, { nullable: true })
  @IsOptional()
  @IsEnum(ShipmentScheduleType)
  scheduleType?: ShipmentScheduleType;

  @Field()
  @IsString()
  @IsNotEmpty()
  pickupAddressId: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  dropoffAddressId: string;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  scheduledAt?: Date;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  packageDescription?: string;

  @Field(() => GraphQLBigInt, { nullable: true })
  @IsOptional()
  packageValueMinor?: bigint;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  specialInstructions?: string;

  @Field(() => Boolean, { nullable: true })
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
}
