import { ObjectType, Field, ID } from '@nestjs/graphql';
import { ShipmentMilestoneType, ShipmentMilestoneStatus } from '../../enums';
import { GraphQLJSON } from 'graphql-scalars';

@ObjectType()
export class ShipmentMilestone {
  @Field(() => ID)
  id: string;

  @Field()
  shipmentId: string;

  @Field(() => ShipmentMilestoneType)
  milestoneType: ShipmentMilestoneType;

  @Field(() => ShipmentMilestoneStatus)
  status: ShipmentMilestoneStatus;

  @Field(() => Date, { nullable: true })
  occurredAt?: Date;

  @Field({ nullable: true })
  lat?: number;

  @Field({ nullable: true })
  lng?: number;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: any;

  @Field()
  createdAt: Date;
}
