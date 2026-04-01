import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import {
  AdminDashboardInterval,
  AdminFleetStatus,
  NotificationAudience,
} from '../../enums';
import { GraphQLBigInt } from '../../scalars';

@ObjectType()
export class AdminDashboardOverview {
  @Field(() => Int)
  totalShipmentsToday: number;

  @Field(() => Int)
  activeTrucks: number;

  @Field(() => Int)
  avgDeliveryMinutes: number;

  @Field(() => Float)
  onTimeDeliveryRate: number;
}

@ObjectType()
export class AdminDashboardPerformancePoint {
  @Field()
  bucketStart: Date;

  @Field()
  label: string;

  @Field(() => Int)
  delivered: number;

  @Field(() => Int)
  delayed: number;
}

@ObjectType()
export class AdminDashboardFleetPoint {
  @Field()
  shipmentId: string;

  @Field()
  trackingCode: string;

  @Field()
  label: string;

  @Field(() => AdminFleetStatus)
  status: AdminFleetStatus;

  @Field(() => Float)
  lat: number;

  @Field(() => Float)
  lng: number;
}

@ObjectType()
export class AdminDashboardFleetRow {
  @Field()
  shipmentId: string;

  @Field()
  trackingCode: string;

  @Field(() => AdminFleetStatus)
  status: AdminFleetStatus;

  @Field(() => String, { nullable: true })
  from?: string;

  @Field(() => String, { nullable: true })
  to?: string;

  @Field(() => Int, { nullable: true })
  etaMinutes?: number;
}

@ObjectType()
export class AdminDashboardOrderStatusMetric {
  @Field()
  key: string;

  @Field()
  label: string;

  @Field(() => Int)
  count: number;
}

@ObjectType()
export class AdminDashboardWalletSummary {
  @Field()
  currency: string;

  @Field(() => GraphQLBigInt)
  balanceMinor: bigint;

  @Field(() => GraphQLBigInt)
  escrowMinor: bigint;
}

@ObjectType()
export class AdminDashboardNotificationMetric {
  @Field(() => NotificationAudience)
  audience: NotificationAudience;

  @Field(() => Int)
  unreadCount: number;

  @Field(() => Int)
  totalCount: number;
}

@ObjectType()
export class AdminDashboard {
  @Field()
  generatedAt: Date;

  @Field()
  rangeFrom: Date;

  @Field()
  rangeTo: Date;

  @Field(() => AdminDashboardInterval)
  interval: AdminDashboardInterval;

  @Field(() => AdminDashboardOverview)
  overview: AdminDashboardOverview;

  @Field(() => [AdminDashboardPerformancePoint])
  deliveryPerformance: AdminDashboardPerformancePoint[];

  @Field(() => [AdminDashboardFleetPoint])
  fleetMap: AdminDashboardFleetPoint[];

  @Field(() => [AdminDashboardFleetRow])
  activeFleet: AdminDashboardFleetRow[];

  @Field(() => [AdminDashboardOrderStatusMetric])
  orderStatus: AdminDashboardOrderStatusMetric[];

  @Field(() => AdminDashboardWalletSummary)
  wallet: AdminDashboardWalletSummary;

  @Field(() => [AdminDashboardNotificationMetric])
  notifications: AdminDashboardNotificationMetric[];
}
