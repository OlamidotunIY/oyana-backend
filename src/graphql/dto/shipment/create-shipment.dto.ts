import { InputType, Field } from '@nestjs/graphql';
import {
  ShipmentMode,
  ShipmentScheduleType,
  ShipmentStatus,
  VehicleCategory,
} from '../../enums';
import { GraphQLBigInt } from '../../scalars';

@InputType()
export class CreateShipmentDto {
  @Field({ nullable: true })
  trackingCode?: string;

  @Field()
  customerProfileId: string;

  @Field(() => ShipmentMode)
  mode: ShipmentMode;

  @Field(() => VehicleCategory)
  vehicleCategory: VehicleCategory;

  @Field(() => ShipmentScheduleType, { nullable: true })
  scheduleType?: ShipmentScheduleType;

  @Field()
  pickupAddressId: string;

  @Field()
  dropoffAddressId: string;

  @Field({ nullable: true })
  scheduledAt?: Date;

  @Field({ nullable: true })
  packageDescription?: string;

  @Field(() => GraphQLBigInt, { nullable: true })
  packageValueMinor?: bigint;

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
}
