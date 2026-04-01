import { Field, InputType } from '@nestjs/graphql';
import { DispatchOfferStatus } from '../../enums';

@InputType()
export class UpdateDispatchOfferDto {
  @Field()
  offerId: string;

  @Field(() => DispatchOfferStatus)
  status: DispatchOfferStatus;

  @Field(() => Date, { nullable: true })
  respondedAt?: Date;

  @Field(() => Float, { nullable: true })
  providerEtaMinutes?: number;
}
