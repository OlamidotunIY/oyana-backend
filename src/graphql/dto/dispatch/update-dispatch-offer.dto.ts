import { Field, InputType, Int } from '@nestjs/graphql';
import { DispatchOfferStatus } from '../../enums';

@InputType()
export class UpdateDispatchOfferDto {
  @Field()
  offerId: string;

  @Field(() => DispatchOfferStatus)
  status: DispatchOfferStatus;

  @Field(() => Date, { nullable: true })
  respondedAt?: Date;

  @Field(() => Int, { nullable: true })
  providerEtaMinutes?: number;
}
