import { Field, ID, ObjectType } from '@nestjs/graphql';
import { DisputeStatus } from '../../enums';
import { DisputeEvent } from './dispute-event.type';

@ObjectType()
export class DisputeCase {
  @Field(() => ID)
  id: string;

  @Field()
  disputeNumber: string;

  @Field()
  ownerProfileId: string;

  @Field(() => String, { nullable: true })
  shipmentId?: string;

  @Field(() => String, { nullable: true })
  invoiceId?: string;

  @Field(() => String, { nullable: true })
  referenceId?: string;

  @Field()
  category: string;

  @Field()
  reason: string;

  @Field(() => DisputeStatus)
  status: DisputeStatus;

  @Field(() => String, { nullable: true })
  resolutionSummary?: string;

  @Field(() => String, { nullable: true })
  resolvedByProfileId?: string;

  @Field({ nullable: true })
  resolvedAt?: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field(() => [DisputeEvent], { nullable: true })
  events?: DisputeEvent[];
}
