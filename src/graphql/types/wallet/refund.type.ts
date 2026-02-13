import { ObjectType, Field, ID } from '@nestjs/graphql';
import { RefundStatus } from '../../enums';
import { GraphQLBigInt } from '../../scalars';

@ObjectType()
export class Refund {
  @Field(() => ID)
  id: string;

  @Field()
  transactionId: string;

  @Field()
  shipmentId: string;

  @Field()
  initiatedByProfileId: string;

  @Field(() => GraphQLBigInt)
  amountMinor: bigint;

  @Field()
  currency: string;

  @Field(() => RefundStatus)
  status: RefundStatus;

  @Field({ nullable: true })
  reason?: string;

  @Field({ nullable: true })
  approvedByProfileId?: string;

  @Field({ nullable: true })
  approvedAt?: Date;

  @Field({ nullable: true })
  processedAt?: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
