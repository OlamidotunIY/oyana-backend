import { ObjectType, Field, ID } from '@nestjs/graphql';
import { BidStatus } from '../../enums';
import { GraphQLBigInt } from '../../scalars';
import { Shipment } from '../shipment/shipment.type';
import { ShipmentBidAward } from './shipment-bid-award.type';
import { Provider } from '../provider';

@ObjectType()
export class ShipmentBid {
  @Field(() => ID)
  id: string;

  @Field()
  shipmentId: string;

  @Field()
  providerId: string;

  @Field(() => GraphQLBigInt)
  amountMinor: bigint;

  @Field()
  currency: string;

  @Field(() => String, { nullable: true })
  message?: string;

  @Field(() => BidStatus)
  status: BidStatus;

  @Field(() => Shipment, { nullable: true })
  shipment?: Shipment;

  @Field(() => ShipmentBidAward, { nullable: true })
  award?: ShipmentBidAward;

  @Field(() => Provider, { nullable: true })
  provider?: Provider;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
