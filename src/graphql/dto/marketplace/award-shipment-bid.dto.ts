import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class AwardShipmentBidDto {
  @Field()
  bidId: string;

  @Field()
  shipmentId: string;

  @Field({ nullable: true })
  awardedByProfileId?: string;

  @Field({ nullable: true })
  notes?: string;
}
