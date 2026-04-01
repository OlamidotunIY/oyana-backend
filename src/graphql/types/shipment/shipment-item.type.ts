import { ObjectType, Field, ID, Float } from '@nestjs/graphql';

@ObjectType()
export class ShipmentItem {
  @Field(() => ID)
  id: string;

  @Field()
  shipmentId: string;

  @Field()
  name: string;

  @Field()
  quantity: number;

  @Field(() => Float, { nullable: true })
  weightKg?: number;

  @Field()
  createdAt: Date;
}
