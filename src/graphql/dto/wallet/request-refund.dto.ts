import { InputType, Field } from '@nestjs/graphql';
import { GraphQLBigInt } from '../../scalars';

@InputType()
export class RequestRefundDto {
  @Field()
  transactionId: string;

  @Field()
  shipmentId: string;

  @Field()
  initiatedByProfileId: string;

  @Field(() => GraphQLBigInt)
  amountMinor: bigint;

  @Field()
  currency: string;

  @Field()
  reason: string;
}
