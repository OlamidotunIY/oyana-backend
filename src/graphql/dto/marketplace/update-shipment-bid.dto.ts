import { InputType, Field } from '@nestjs/graphql';
import { BidStatus } from '../../enums';
import { GraphQLBigInt } from '../../scalars';

@InputType()
export class UpdateShipmentBidDto {
  @Field(() => BidStatus, { nullable: true })
  status?: BidStatus;

  @Field(() => GraphQLBigInt, { nullable: true })
  amountMinor?: bigint;

  @Field({ nullable: true })
  currency?: string;

  @Field({ nullable: true })
  message?: string;
}
