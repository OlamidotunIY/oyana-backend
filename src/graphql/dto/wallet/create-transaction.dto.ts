import { InputType, Field } from '@nestjs/graphql';
import { TransactionType } from '../../enums';
import { GraphQLBigInt } from '../../scalars';

@InputType()
export class CreateTransactionDto {
  @Field()
  walletAccountId: string;

  @Field(() => TransactionType)
  transactionType: TransactionType;

  @Field(() => GraphQLBigInt)
  amountMinor: bigint;

  @Field()
  currency: string;

  @Field({ nullable: true })
  referenceId?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  jobId?: string;

  @Field({ nullable: true })
  paymentIntentId?: string;
}
