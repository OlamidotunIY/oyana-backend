import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class AwardShipmentBidDto {
  @Field()
  bidId: string;

  @Field()
  shipmentId: string;

  @Field()
  awardedByProfileId: string;

  @Field({ nullable: true })
  notes?: string;
}
