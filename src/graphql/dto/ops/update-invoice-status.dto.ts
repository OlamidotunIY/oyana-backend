import { Field, InputType } from '@nestjs/graphql';
import { InvoiceStatus } from '../../enums';

@InputType()
export class UpdateInvoiceStatusDto {
  @Field()
  invoiceId: string;

  @Field(() => InvoiceStatus)
  status: InvoiceStatus;
}
