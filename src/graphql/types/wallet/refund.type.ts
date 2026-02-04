import { ObjectType, Field, ID } from '@nestjs/graphql';
import { RefundStatus } from '../../enums';
import { GraphQLBigInt } from '../../scalars';

@ObjectType()
export class Refund {
  @Field(() => ID)
  id: string;

  @Field()
  transactionId: string;

  @Field(() => GraphQLBigInt)
  refundAmountMinor: bigint;

  @Field()
  currency: string;

  @Field(() => RefundStatus)
  status: RefundStatus;

  @Field()
  reason: string;

  @Field({ nullable: true })
  approvedBy?: string;

  @Field({ nullable: true })
  approvedAt?: Date;

  @Field({ nullable: true })
  processedAt?: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
