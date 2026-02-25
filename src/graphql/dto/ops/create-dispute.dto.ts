import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateDisputeDto {
  @Field()
  category: string;

  @Field()
  reason: string;

  @Field({ nullable: true })
  referenceId?: string;

  @Field({ nullable: true })
  shipmentId?: string;

  @Field({ nullable: true })
  invoiceId?: string;
}
