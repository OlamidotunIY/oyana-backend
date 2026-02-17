import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { VehicleCategory, VehicleStatus } from '../../enums';
import { GraphQLBigInt } from '../../scalars';

@ObjectType()
export class Vehicle {
  @Field(() => ID)
  id: string;

  @Field()
  providerId: string;

  @Field(() => VehicleCategory)
  category: VehicleCategory;

  @Field({ nullable: true })
  plateNumber?: string;

  @Field({ nullable: true })
  make?: string;

  @Field({ nullable: true })
  model?: string;

  @Field({ nullable: true })
  color?: string;

  @Field(() => Int, { nullable: true })
  capacityKg?: number;

  @Field(() => GraphQLBigInt, { nullable: true })
  capacityVolumeCm3?: bigint;

  @Field(() => VehicleStatus)
  status: VehicleStatus;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
