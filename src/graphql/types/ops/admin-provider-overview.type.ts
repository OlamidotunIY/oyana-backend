import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { DriverType, VehicleCategory } from '../../enums';

@ObjectType()
export class AdminProviderOverview {
  @Field(() => ID)
  id: string;

  @Field()
  businessName: string;

  @Field(() => DriverType, { nullable: true })
  driverType?: DriverType | null;

  @Field(() => String, { nullable: true })
  fullName?: string | null;

  @Field(() => String, { nullable: true })
  firstName?: string | null;

  @Field(() => String, { nullable: true })
  lastName?: string | null;

  @Field()
  status: string;

  @Field(() => Boolean)
  phoneVerified: boolean;

  @Field(() => Boolean)
  isAvailable: boolean;

  @Field(() => String, { nullable: true })
  activeAddress?: string | null;

  @Field(() => String, { nullable: true })
  activeCity?: string | null;

  @Field(() => VehicleCategory, { nullable: true })
  primaryVehicleCategory?: VehicleCategory | null;

  @Field(() => String, { nullable: true })
  primaryVehiclePlateNumber?: string | null;

  @Field(() => Int, { nullable: true })
  primaryVehicleCapacityKg?: number | null;

  @Field(() => Int)
  activeAssignments: number;

  @Field(() => Int)
  openOffers: number;

  @Field()
  kycStatus: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
