import { InputType, Field } from '@nestjs/graphql';
import { BidStatus } from '../../enums';

@InputType()
export class UpdateBidDto {
  @Field(() => BidStatus)
  status: BidStatus;
}
