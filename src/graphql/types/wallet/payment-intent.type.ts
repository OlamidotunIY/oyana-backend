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
  paymentGateway: string;

  @Field()
  gatewayPaymentId: string;

  @Field(() => GraphQLBigInt)
  amountMinor: bigint;

  @Field()
  currency: string;

  @Field(() => PaymentIntentStatus)
  status: PaymentIntentStatus;

  @Field({ nullable: true })
  confirmedAt?: Date;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: any;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
