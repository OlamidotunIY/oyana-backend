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

  @Field(() => String, { nullable: true })
  reason?: string;

  @Field(() => String, { nullable: true })
  approvedByProfileId?: string;

  @Field(() => Date, { nullable: true })
  approvedAt?: Date;

  @Field(() => Date, { nullable: true })
  processedAt?: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
