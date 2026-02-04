import { InputType, Field } from '@nestjs/graphql';
import { DispatchOfferStatus } from '../../enums';

@InputType()
export class UpdateDispatchOfferDto {
  @Field(() => DispatchOfferStatus)
  status: DispatchOfferStatus;
}
