import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
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

  @Field(() => String, { nullable: true })
  pickupAddressSummary?: string;

  @Field(() => String, { nullable: true })
  dropoffAddressSummary?: string;
}

@ObjectType()
export class ShipmentDashboard {
  @Field(() => ShipmentDashboardSummary)
  summary: ShipmentDashboardSummary;

  @Field(() => [ShipmentDashboardRecentShipment])
  recentShipments: ShipmentDashboardRecentShipment[];
}

@ObjectType()
export class ProviderDispatchStats {
  @Field(() => Int)
  offersReceived: number;

  @Field(() => Int)
  offersAccepted: number;

  @Field(() => Int)
  offersDeclined: number;

  @Field(() => Int)
  offersExpired: number;

  @Field(() => Float)
  acceptanceRate: number;
}

@ObjectType()
export class ProviderEarningsSummary {
  @Field(() => GraphQLBigInt)
  totalEarningsMinor: bigint;

  @Field(() => GraphQLBigInt)
  earningsThisMonthMinor: bigint;

  @Field()
  currency: string;
}

@ObjectType()
export class ProviderPerformance {
  @Field(() => Float)
  ratingAvg: number;

  @Field(() => Int)
  ratingCount: number;

  @Field(() => Int)
  priorityScore: number;

  @Field()
  isAvailable: boolean;

  @Field(() => Int)
  teamMembersCount: number;

  @Field(() => Int)
  penaltiesCount: number;

  @Field(() => Int)
  penaltyPoints: number;
}
