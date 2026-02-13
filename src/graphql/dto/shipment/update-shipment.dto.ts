import { InputType, Field } from '@nestjs/graphql';
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
  trackingCode?: string;

  @Field({ nullable: true })
  customerProfileId?: string;

  @Field(() => ShipmentMode, { nullable: true })
  mode?: ShipmentMode;

  @Field(() => VehicleCategory, { nullable: true })
  vehicleCategory?: VehicleCategory;

  @Field(() => ShipmentScheduleType, { nullable: true })
  scheduleType?: ShipmentScheduleType;

  @Field(() => ShipmentStatus, { nullable: true })
  status?: ShipmentStatus;

  @Field({ nullable: true })
  pickupAddressId?: string;

  @Field({ nullable: true })
  dropoffAddressId?: string;

  @Field({ nullable: true })
  scheduledAt?: Date;

  @Field(() => GraphQLBigInt, { nullable: true })
  packageValueMinor?: bigint;

  @Field({ nullable: true })
  packageDescription?: string;

  @Field({ nullable: true })
  specialInstructions?: string;

  @Field({ nullable: true })
  requiresEscrow?: boolean;

  @Field({ nullable: true })
  pricingCurrency?: string;

  @Field(() => GraphQLBigInt, { nullable: true })
  quotedPriceMinor?: bigint;

  @Field(() => GraphQLBigInt, { nullable: true })
  finalPriceMinor?: bigint;

  @Field({ nullable: true })
  commissionRateBps?: number;

  @Field(() => GraphQLBigInt, { nullable: true })
  commissionAmountMinor?: bigint;

  @Field({ nullable: true })
  cancelledAt?: Date;

  @Field({ nullable: true })
  cancelledByProfileId?: string;

  @Field({ nullable: true })
  cancellationReason?: string;
}
