import { Field, InputType } from '@nestjs/graphql';
import { CreateInvoiceLineItemDto } from './create-invoice-line-item.dto';

@InputType()
export class CreateInvoiceDto {
  @Field()
  profileId: string;

  @Field(() => String, { nullable: true })
  shipmentId?: string;

  @Field(() => String, { nullable: true })
  currency?: string;

  @Field(() => Date, { nullable: true })
  dueAt?: Date;

  @Field(() => String, { nullable: true })
  notes?: string;

  @Field(() => [CreateInvoiceLineItemDto])
  lineItems: CreateInvoiceLineItemDto[];
}
