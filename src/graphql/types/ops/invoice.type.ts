import { Field, ID, ObjectType } from '@nestjs/graphql';
import { InvoiceStatus } from '../../enums';
import { GraphQLBigInt } from '../../scalars';
import { InvoiceLineItem } from './invoice-line-item.type';

@ObjectType()
export class Invoice {
  @Field(() => ID)
  id: string;

  @Field()
  invoiceNumber: string;

  @Field()
  profileId: string;

  @Field({ nullable: true })
  shipmentId?: string;

  @Field(() => InvoiceStatus)
  status: InvoiceStatus;

  @Field()
  currency: string;

  @Field(() => GraphQLBigInt)
  subtotalMinor: bigint;

  @Field(() => GraphQLBigInt)
  feeMinor: bigint;

  @Field(() => GraphQLBigInt)
  taxMinor: bigint;

  @Field(() => GraphQLBigInt)
  totalMinor: bigint;

  @Field()
  issuedAt: Date;

  @Field({ nullable: true })
  dueAt?: Date;

  @Field({ nullable: true })
  paidAt?: Date;

  @Field({ nullable: true })
  notes?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field(() => [InvoiceLineItem], { nullable: true })
  lineItems?: InvoiceLineItem[];
}
