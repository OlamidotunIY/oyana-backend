import { ObjectType, Field, ID } from '@nestjs/graphql';
import { PaymentIntentStatus } from '../../enums';
import { GraphQLBigInt } from '../../scalars';
import { GraphQLJSON } from 'graphql-scalars';

@ObjectType()
export class PaymentIntent {
  @Field(() => ID)
  id: string;

  @Field()
  walletAccountId: string;

  @Field()
  provider: string;

  @Field(() => GraphQLBigInt)
  amountMinor: bigint;

  @Field()
  currency: string;

  @Field(() => PaymentIntentStatus)
  status: PaymentIntentStatus;

  @Field({ nullable: true })
  paystackReference?: string;

  @Field({ nullable: true })
  authorizationUrl?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  rawInitResponse?: any;

  @Field(() => GraphQLJSON, { nullable: true })
  rawWebhook?: any;

  @Field({ nullable: true })
  confirmedAt?: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
