import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class AwardShipmentBidDto {
  @Field()
  bidId: string;

  @Field()
  shipmentId: string;

  @Field(() => String, { nullable: true })
  awardedByProfileId?: string;

  @Field(() => String, { nullable: true })
  notes?: string;
}
