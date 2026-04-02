import { ObjectType, Field, ID } from '@nestjs/graphql';
import { ShipmentAssignmentStatus } from '../../enums';
import { GraphQLBigInt } from '../../scalars';

@ObjectType()
export class ShipmentAssignment {
  @Field(() => ID)
  id: string;

  @Field()
  shipmentId: string;

  @Field()
  providerId: string;

  @Field(() => String, { nullable: true })
  driverProfileId?: string;

  @Field(() => String, { nullable: true })
  dispatchOfferId?: string;

  @Field(() => GraphQLBigInt, { nullable: true })
  agreedPriceMinor?: bigint;

  @Field(() => String, { nullable: true })
  currency?: string;

  @Field(() => ShipmentAssignmentStatus)
  status: ShipmentAssignmentStatus;

  @Field(() => Date, { nullable: true })
  assignedAt?: Date;

  @Field(() => Date, { nullable: true })
  completedAt?: Date;

  @Field(() => Date, { nullable: true })
  cancelledAt?: Date;

  @Field(() => String, { nullable: true })
  cancellationReason?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
