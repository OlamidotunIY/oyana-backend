import { InputType, Field } from '@nestjs/graphql';
import { GraphQLBigInt } from '../../scalars';

@InputType()
export class CreatePaymentIntentDto {
  @Field()
  walletAccountId: string;

  @Field({ nullable: true })
  provider?: string;

  @Field(() => GraphQLBigInt)
  amountMinor: bigint;

  @Field()
  currency: string;
}
