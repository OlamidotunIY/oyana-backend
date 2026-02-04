import { InputType, Field } from '@nestjs/graphql';
import { GraphQLBigInt } from '../../scalars';
import { GraphQLJSON } from 'graphql-scalars';

@InputType()
export class CreatePaymentIntentDto {
  @Field()
  walletAccountId: string;

  @Field()
  paymentGateway: string;

  @Field(() => GraphQLBigInt)
  amountMinor: bigint;

  @Field()
  currency: string;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: any;
}
