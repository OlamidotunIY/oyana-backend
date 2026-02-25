import { Field, InputType, Int } from '@nestjs/graphql';
import { GraphQLBigInt } from '../../scalars';

@InputType()
export class CreateInvoiceLineItemDto {
  @Field()
  description: string;

  @Field(() => Int, { nullable: true })
  quantity?: number;

  @Field(() => GraphQLBigInt)
  unitAmountMinor: bigint;
}
