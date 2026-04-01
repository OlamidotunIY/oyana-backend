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

  @Field(() => String, { nullable: true })
  bankCode?: string;

  @Field(() => String, { nullable: true })
  bankName?: string;

  @Field(() => String, { nullable: true })
  accountNumberMasked?: string;

  @Field(() => String, { nullable: true })
  accountName?: string;

  @Field(() => String, { nullable: true })
  recipientCode?: string;

  @Field(() => String, { nullable: true })
  transferCode?: string;

  @Field(() => String, { nullable: true })
  paystackTransferId?: string;

  @Field(() => String, { nullable: true })
  failureReason?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  rawInitResponse?: Record<string, unknown>;

  @Field(() => GraphQLJSON, { nullable: true })
  rawWebhook?: Record<string, unknown>;

  @Field(() => Date, { nullable: true })
  completedAt?: Date;

  @Field(() => Date, { nullable: true })
  failedAt?: Date;

  @Field(() => String, { nullable: true })
  relatedTransactionId?: string;

  @Field(() => String, { nullable: true })
  savedBankAccountId?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
