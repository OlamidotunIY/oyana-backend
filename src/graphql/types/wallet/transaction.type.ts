import { ObjectType, Field, ID } from '@nestjs/graphql';
import { TransactionType, TransactionStatus } from '../../enums';
import { GraphQLBigInt } from '../../scalars';

@ObjectType()
export class Transaction {
  @Field(() => ID)
  id: string;

  @Field()
  walletAccountId: string;

  @Field(() => TransactionType)
  transactionType: TransactionType;

  @Field(() => GraphQLBigInt)
  amountMinor: bigint;

  @Field()
  currency: string;

  @Field(() => TransactionStatus)
  status: TransactionStatus;

  @Field({ nullable: true })
  referenceId?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  jobId?: string;

  @Field({ nullable: true })
  paymentIntentId?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
