import { ObjectType, Field, ID } from '@nestjs/graphql';
import { BidStatus } from '../../enums';
import { GraphQLBigInt } from '../../scalars';

@ObjectType()
export class JobBid {
  @Field(() => ID)
  id: string;

  @Field()
  jobId: string;

  @Field()
  providerId: string;

  @Field(() => GraphQLBigInt)
  bidAmountMinor: bigint;

  @Field()
  currency: string;

  @Field(() => BidStatus)
  status: BidStatus;

  @Field({ nullable: true })
  proposedPickupTime?: Date;

  @Field({ nullable: true })
  proposedDeliveryTime?: Date;

  @Field({ nullable: true })
  coverLetter?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
