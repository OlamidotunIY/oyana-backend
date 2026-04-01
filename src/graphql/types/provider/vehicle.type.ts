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

  @Field(() => String, { nullable: true })
  plateNumber?: string;

  @Field(() => String, { nullable: true })
  vin?: string;

  @Field(() => String, { nullable: true })
  make?: string;

  @Field(() => String, { nullable: true })
  model?: string;

  @Field(() => String, { nullable: true })
  color?: string;

  @Field(() => Int, { nullable: true })
  capacityKg?: number;

  @Field(() => GraphQLBigInt, { nullable: true })
  capacityVolumeCm3?: bigint;

  @Field(() => String, { nullable: true })
  plateVerificationStatus?: string;

  @Field(() => String, { nullable: true })
  vinVerificationStatus?: string;

  @Field(() => Date, { nullable: true })
  lastVerificationAt?: Date;

  @Field(() => String, { nullable: true })
  verificationFailureReason?: string;

  @Field(() => VehicleStatus)
  status: VehicleStatus;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
