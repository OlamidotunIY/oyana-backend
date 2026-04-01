import { Field, ID, ObjectType } from '@nestjs/graphql';
import { SupportTicketPriority, SupportTicketStatus } from '../../enums';
import { SupportTicketMessage } from './support-ticket-message.type';

@ObjectType()
export class SupportTicket {
  @Field(() => ID)
  id: string;

  @Field()
  ticketNumber: string;

  @Field()
  ownerProfileId: string;

  @Field()
  subject: string;

  @Field()
  category: string;

  @Field(() => SupportTicketPriority)
  priority: SupportTicketPriority;

  @Field(() => SupportTicketStatus)
  status: SupportTicketStatus;

  @Field(() => String, { nullable: true })
  referenceId?: string;

  @Field()
  description: string;

  @Field(() => String, { nullable: true })
  assignedAdminProfileId?: string;

  @Field({ nullable: true })
  resolvedAt?: Date;

  @Field({ nullable: true })
  closedAt?: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field(() => [SupportTicketMessage], { nullable: true })
  messages?: SupportTicketMessage[];
}
