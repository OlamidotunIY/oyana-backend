import { Field, InputType } from '@nestjs/graphql';
import { CreateInvoiceLineItemDto } from './create-invoice-line-item.dto';

@InputType()
export class CreateInvoiceDto {
  @Field()
  profileId: string;

  @Field({ nullable: true })
  shipmentId?: string;

  @Field({ nullable: true })
  currency?: string;

  @Field({ nullable: true })
  dueAt?: Date;

  @Field({ nullable: true })
  notes?: string;

  @Field(() => [CreateInvoiceLineItemDto])
  lineItems: CreateInvoiceLineItemDto[];
}
