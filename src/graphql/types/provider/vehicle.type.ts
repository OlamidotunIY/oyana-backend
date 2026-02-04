import { ObjectType, Field, ID } from '@nestjs/graphql';
import { VehicleType, VehicleStatus } from '../../enums';

@ObjectType()
export class Vehicle {
  @Field(() => ID)
  id: string;

  @Field()
  providerId: string;

  @Field()
  registrationNumber: string;

  @Field(() => VehicleType)
  vehicleType: VehicleType;

  @Field({ nullable: true })
  make?: string;

  @Field({ nullable: true })
  model?: string;

  @Field({ nullable: true })
  year?: number;

  @Field({ nullable: true })
  color?: string;

  @Field(() => VehicleStatus)
  status: VehicleStatus;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
