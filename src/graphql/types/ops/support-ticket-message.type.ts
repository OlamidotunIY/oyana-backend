import { Field, ID, ObjectType } from '@nestjs/graphql';
import { ShipmentActorRole } from '../../enums';

@ObjectType()
export class SupportTicketMessage {
  @Field(() => ID)
  id: string;

  @Field()
  ticketId: string;

  @Field(() => String, { nullable: true })
  authorProfileId?: string;

  @Field(() => ShipmentActorRole)
  authorRole: ShipmentActorRole;

  @Field()
  body: string;

  @Field()
  createdAt: Date;
}
