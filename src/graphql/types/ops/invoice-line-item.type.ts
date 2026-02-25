import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { GraphQLBigInt } from '../../scalars';

@ObjectType()
export class InvoiceLineItem {
  @Field(() => ID)
  id: string;

  @Field()
  invoiceId: string;

  @Field()
  description: string;

  @Field(() => Int)
  quantity: number;

  @Field(() => GraphQLBigInt)
  unitAmountMinor: bigint;

  @Field(() => GraphQLBigInt)
  totalAmountMinor: bigint;

  @Field()
  createdAt: Date;
}
