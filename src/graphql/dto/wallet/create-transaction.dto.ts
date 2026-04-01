import { InputType, Field } from '@nestjs/graphql';
import { TransactionDirection, TransactionType } from '../../enums';
import { GraphQLBigInt } from '../../scalars';
import { GraphQLJSON } from 'graphql-scalars';

@InputType()
export class CreateTransactionDto {
  @Field()
  walletAccountId: string;

  @Field(() => TransactionDirection)
  direction: TransactionDirection;

  @Field(() => TransactionType)
  transactionType: TransactionType;

  @Field(() => GraphQLBigInt)
  amountMinor: bigint;

  @Field()
  currency: string;

  @Field()
  reference: string;

  @Field(() => String, { nullable: true })
  status?: string;

  @Field(() => String, { nullable: true })
  shipmentId?: string;

  @Field(() => String, { nullable: true })
  paymentIntentId?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: any;
}
