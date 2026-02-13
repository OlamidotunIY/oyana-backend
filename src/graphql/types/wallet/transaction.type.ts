import { ObjectType, Field, ID } from '@nestjs/graphql';
import {
  TransactionDirection,
  TransactionStatus,
  TransactionType,
} from '../../enums';
import { GraphQLBigInt } from '../../scalars';
import { GraphQLJSON } from 'graphql-scalars';

@ObjectType()
export class Transaction {
  @Field(() => ID)
  id: string;

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

  @Field(() => TransactionStatus)
  status: TransactionStatus;

  @Field()
  reference: string;

  @Field({ nullable: true })
  shipmentId?: string;

  @Field({ nullable: true })
  paymentIntentId?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: any;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
