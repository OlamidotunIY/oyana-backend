import { ObjectType, Field, ID } from '@nestjs/graphql';
import { ShipmentActorRole, ShipmentEventType } from '../../enums';
import { GraphQLJSON } from 'graphql-scalars';

@ObjectType()
export class ShipmentEvent {
  @Field(() => ID)
  id: string;

  @Field()
  shipmentId: string;

  @Field(() => ShipmentEventType)
  eventType: ShipmentEventType;

  @Field(() => String, { nullable: true })
  actorProfileId?: string;

  @Field(() => ShipmentActorRole, { nullable: true })
  actorRole?: ShipmentActorRole;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: any;

  @Field()
  createdAt: Date;
}
