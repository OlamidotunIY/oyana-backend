import { Field, ObjectType } from '@nestjs/graphql';
import { PaymentIntentStatus } from '../../enums';
import { PaymentIntent } from './payment-intent.type';
import { Transaction } from './transaction.type';

@ObjectType()
export class WalletFundingResult {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => PaymentIntentStatus)
  status: PaymentIntentStatus;

  @Field()
  reference: string;

  @Field(() => String, { nullable: true })
  authorizationUrl?: string;

  @Field(() => String, { nullable: true })
  message?: string;

  @Field(() => PaymentIntent, { nullable: true })
  paymentIntent?: PaymentIntent;

  @Field(() => Transaction, { nullable: true })
  walletTransaction?: Transaction;
}
