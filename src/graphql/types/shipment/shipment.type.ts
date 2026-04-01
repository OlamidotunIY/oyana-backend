import { ObjectType, Field, ID } from '@nestjs/graphql';
import {
  ShipmentMode,
  ShipmentScheduleType,
  ShipmentStatus,
  VehicleCategory,
} from '../../enums';
import { GraphQLBigInt } from '../../scalars';
import { UserAddress } from './shipment-location.type';
import { ShipmentItem } from './shipment-item.type';

@ObjectType()
export class Shipment {
  @Field(() => ID)
  id: string;

  @Field()
  trackingCode: string;

  @Field()
  customerProfileId: string;

  @Field(() => ShipmentMode)
  mode: ShipmentMode;

  @Field(() => VehicleCategory)
  vehicleCategory: VehicleCategory;

  @Field(() => ShipmentScheduleType)
  scheduleType: ShipmentScheduleType;

  @Field(() => ShipmentStatus)
  status: ShipmentStatus;

  @Field()
  pickupAddressId: string;

  @Field()
  dropoffAddressId: string;

  @Field(() => String, { nullable: true })
  pickupAddressSummary?: string;

  @Field(() => String, { nullable: true })
  dropoffAddressSummary?: string;

  @Field(() => UserAddress, { nullable: true })
  pickupAddress?: UserAddress;

  @Field(() => UserAddress, { nullable: true })
  dropoffAddress?: UserAddress;

  @Field(() => [ShipmentItem], { nullable: true })
  items?: ShipmentItem[];

  @Field({ nullable: true })
  scheduledAt?: Date;

  @Field(() => String, { nullable: true })
  packageDescription?: string;

  @Field(() => GraphQLBigInt, { nullable: true })
  packageValueMinor?: bigint;

  @Field(() => String, { nullable: true })
  specialInstructions?: string;

  @Field()
  requiresEscrow: boolean;

  @Field()
  pricingCurrency: string;

  @Field(() => GraphQLBigInt, { nullable: true })
  quotedPriceMinor?: bigint;

  @Field(() => GraphQLBigInt, { nullable: true })
  finalPriceMinor?: bigint;

  @Field()
  commissionRateBps: number;

  @Field(() => GraphQLBigInt)
  commissionAmountMinor: bigint;

  @Field({ nullable: true })
  cancelledAt?: Date;

  @Field(() => String, { nullable: true })
  cancelledByProfileId?: string;

  @Field(() => String, { nullable: true })
  cancellationReason?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
