import { Field, ObjectType } from '@nestjs/graphql';
import { ProviderKycStatus } from '../provider/provider-kyc-status.type';
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

  @Field(() => ProviderKycStatus, { nullable: true })
  kycStatus?: ProviderKycStatus | null;

  @Field(() => [Shipment])
  activeAssignments: Shipment[];

  @Field(() => [Shipment])
  completedShipments: Shipment[];

  @Field(() => [Vehicle])
  vehicles: Vehicle[];
}
