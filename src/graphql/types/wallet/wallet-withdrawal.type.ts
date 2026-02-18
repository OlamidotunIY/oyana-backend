import { Field, ID, ObjectType } from '@nestjs/graphql';
import { GraphQLBigInt } from '../../scalars';
import { GraphQLJSON } from 'graphql-scalars';

@ObjectType()
export class WalletWithdrawal {
  @Field(() => ID)
  id: string;

  @Field()
  walletAccountId: string;

  @Field()
  profileId: string;

  @Field()
  reference: string;

  @Field(() => GraphQLBigInt)
  amountMinor: bigint;

  @Field()
  currency: string;

  @Field()
  status: string;

  @Field({ nullable: true })
  bankCode?: string;

  @Field({ nullable: true })
  bankName?: string;

  @Field({ nullable: true })
  accountNumberMasked?: string;

  @Field({ nullable: true })
  accountName?: string;

  @Field({ nullable: true })
  recipientCode?: string;

  @Field({ nullable: true })
  transferCode?: string;

  @Field({ nullable: true })
  paystackTransferId?: string;

  @Field({ nullable: true })
  failureReason?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  rawInitResponse?: Record<string, unknown>;

  @Field(() => GraphQLJSON, { nullable: true })
  rawWebhook?: Record<string, unknown>;

  @Field({ nullable: true })
  completedAt?: Date;

  @Field({ nullable: true })
  failedAt?: Date;

  @Field({ nullable: true })
  relatedTransactionId?: string;

  @Field({ nullable: true })
  savedBankAccountId?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
