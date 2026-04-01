import { Field, ID, ObjectType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';

@ObjectType()
export class WalletSavedBankAccount {
  @Field(() => ID)
  id: string;

  @Field()
  profileId: string;

  @Field()
  walletAccountId: string;

  @Field()
  provider: string;

  @Field()
  bankCode: string;

  @Field()
  bankName: string;

  @Field()
  accountNumberMasked: string;

  @Field()
  accountName: string;

  @Field()
  recipientCode: string;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: Record<string, unknown>;

  @Field(() => Date, { nullable: true })
  lastUsedAt?: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
