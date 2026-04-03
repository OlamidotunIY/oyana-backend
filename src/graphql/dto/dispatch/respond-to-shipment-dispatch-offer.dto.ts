import { Field, InputType } from '@nestjs/graphql';
import { DispatchOfferStatus } from '../../enums';

@InputType()
export class RespondToShipmentDispatchOfferDto {
  @Field()
  offerId: string;

  @Field()
  shipmentId: string;

  @Field(() => DispatchOfferStatus)
  status: DispatchOfferStatus;

  @Field(() => Date, { nullable: true })
  respondedAt?: Date;
}
