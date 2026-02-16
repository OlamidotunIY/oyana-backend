import { Field, Int, ObjectType } from '@nestjs/graphql';
import { ShipmentMode, ShipmentStatus } from '../../enums';
import { GraphQLBigInt } from '../../scalars';

@ObjectType()
export class ShipmentDashboardSummary {
  @Field(() => Int)
  totalShipments: number;

  @Field(() => Int)
  activeShipments: number;

  @Field(() => Int)
  completedThisMonth: number;

  @Field(() => Int)
  pendingPaymentCount: number;

  @Field(() => GraphQLBigInt)
  pendingPaymentAmountMinor: bigint;

  @Field()
  pendingPaymentCurrency: string;
}

@ObjectType()
export class ShipmentDashboardRecentShipment {
  @Field()
  id: string;

  @Field()
  trackingCode: string;

  @Field(() => ShipmentStatus)
  status: ShipmentStatus;

  @Field(() => ShipmentMode)
  mode: ShipmentMode;

  @Field({ nullable: true })
  scheduledAt?: Date;

  @Field()
  createdAt: Date;

  @Field({ nullable: true })
  pickupAddressSummary?: string;

  @Field({ nullable: true })
  dropoffAddressSummary?: string;
}

@ObjectType()
export class ShipmentDashboard {
  @Field(() => ShipmentDashboardSummary)
  summary: ShipmentDashboardSummary;

  @Field(() => [ShipmentDashboardRecentShipment])
  recentShipments: ShipmentDashboardRecentShipment[];
}
