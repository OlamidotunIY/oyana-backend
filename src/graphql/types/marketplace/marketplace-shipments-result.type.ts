import { Field, ObjectType } from '@nestjs/graphql';
import { Shipment } from '../shipment/shipment.type';

@ObjectType()
export class MarketplaceShipmentsResult {
  @Field(() => [Shipment])
  items: Shipment[];

  @Field(() => String, { nullable: true })
  nextCursor?: string;

  @Field(() => String, { nullable: true })
  reason?: string;
}
