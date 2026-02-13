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

  @Field({ nullable: true })
  vehicleId?: string;

  @Field({ nullable: true })
  driverProfileId?: string;

  @Field({ nullable: true })
  dispatchOfferId?: string;

  @Field(() => GraphQLBigInt, { nullable: true })
  agreedPriceMinor?: bigint;

  @Field({ nullable: true })
  currency?: string;

  @Field(() => ShipmentAssignmentStatus)
  status: ShipmentAssignmentStatus;

  @Field({ nullable: true })
  assignedAt?: Date;

  @Field({ nullable: true })
  completedAt?: Date;

  @Field({ nullable: true })
  cancelledAt?: Date;

  @Field({ nullable: true })
  cancellationReason?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
