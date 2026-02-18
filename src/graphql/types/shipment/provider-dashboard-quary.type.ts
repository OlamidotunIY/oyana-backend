import { Field, ObjectType } from '@nestjs/graphql';
import { KYCCase } from '../provider/kyc-case.type';
import { Vehicle } from '../provider/vehicle.type';
import { WalletAccount } from '../wallet/wallet-account.type';
import { ShipmentDashboard } from './shipment-dashboard.type';
import { Shipment } from './shipment.type';

@ObjectType()
export class ProviderDashboardQuary {
  @Field(() => ShipmentDashboard)
  myShipmentDashboard: ShipmentDashboard;

  @Field(() => WalletAccount, { nullable: true })
  myWallet: WalletAccount | null;

  @Field(() => [KYCCase])
  kycCases: KYCCase[];

  @Field(() => [Shipment])
  activeAssignments: Shipment[];

  @Field(() => [Shipment])
  completedShipments: Shipment[];

  @Field(() => [Vehicle])
  vehicles: Vehicle[];
}
