import { InputType, Field } from '@nestjs/graphql';
import { GraphQLBigInt } from '../../scalars';

@InputType()
export class RequestRefundDto {
  @Field()
  transactionId: string;

  @Field(() => GraphQLBigInt)
  refundAmountMinor: bigint;

  @Field()
  currency: string;

  @Field()
  reason: string;
}
