import { ObjectType, Field, ID } from '@nestjs/graphql';
import { BidStatus } from '../../enums';
import { GraphQLBigInt } from '../../scalars';

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

  @Field({ nullable: true })
  message?: string;

  @Field(() => BidStatus)
  status: BidStatus;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
