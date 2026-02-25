import { Field, Int, ObjectType } from '@nestjs/graphql';
import { GraphQLBigInt } from '../../scalars';

@ObjectType()
export class AdminFinanceSummary {
  @Field()
  currency: string;

  @Field(() => GraphQLBigInt)
  totalWalletBalanceMinor: bigint;

  @Field(() => GraphQLBigInt)
  totalEscrowMinor: bigint;

  @Field(() => Int)
  pendingRefundCount: number;

  @Field(() => GraphQLBigInt)
  pendingRefundAmountMinor: bigint;

  @Field(() => Int)
  overdueInvoiceCount: number;

  @Field(() => GraphQLBigInt)
  overdueInvoiceAmountMinor: bigint;
}
