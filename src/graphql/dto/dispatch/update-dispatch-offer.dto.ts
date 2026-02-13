import { InputType, Field } from '@nestjs/graphql';
import { DispatchOfferStatus } from '../../enums';

@InputType()
export class UpdateDispatchOfferDto {
  @Field(() => DispatchOfferStatus)
  status: DispatchOfferStatus;

  @Field({ nullable: true })
  respondedAt?: Date;

  @Field({ nullable: true })
  providerEtaMinutes?: number;
}
