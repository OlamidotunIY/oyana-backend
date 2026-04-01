import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateDisputeDto {
  @Field()
  category: string;

  @Field()
  reason: string;

  @Field(() => String, { nullable: true })
  referenceId?: string;

  @Field(() => String, { nullable: true })
  shipmentId?: string;

  @Field(() => String, { nullable: true })
  invoiceId?: string;
}
