import { InputType, Field, Float } from '@nestjs/graphql';

@InputType()
export class AddShipmentItemDto {
  @Field()
  shipmentId: string;

  @Field()
  name: string;

  @Field()
  quantity: number;

  @Field(() => Float, { nullable: true })
  weightKg?: number;
}
