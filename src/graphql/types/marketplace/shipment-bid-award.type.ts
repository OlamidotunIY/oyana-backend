import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class ShipmentBidAward {
  @Field(() => ID)
  id: string;

  @Field()
  shipmentId: string;

  @Field()
  bidId: string;

  @Field()
  awardedByProfileId: string;

  @Field()
  awardedAt: Date;

  @Field({ nullable: true })
  notes?: string;
}
