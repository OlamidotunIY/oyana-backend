import { Field, ID, ObjectType } from '@nestjs/graphql';
import { DisputeEventType, ShipmentActorRole } from '../../enums';
import { GraphQLJSON } from 'graphql-scalars';

@ObjectType()
export class DisputeEvent {
  @Field(() => ID)
  id: string;

  @Field()
  disputeCaseId: string;

  @Field({ nullable: true })
  actorProfileId?: string;

  @Field(() => ShipmentActorRole)
  actorRole: ShipmentActorRole;

  @Field(() => DisputeEventType)
  eventType: DisputeEventType;

  @Field({ nullable: true })
  message?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: unknown;

  @Field()
  createdAt: Date;
}
