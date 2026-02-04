import { ObjectType, Field, ID } from '@nestjs/graphql';
import { DispatchOfferStatus } from '../../enums';
import { GraphQLBigInt } from '../../scalars';

@ObjectType()
export class DispatchOffer {
  @Field(() => ID)
  id: string;

  @Field()
  batchId: string;

  @Field()
  providerId: string;

  @Field()
  jobId: string;

  @Field(() => GraphQLBigInt)
  offeredPriceMinor: bigint;

  @Field()
  currency: string;

  @Field(() => DispatchOfferStatus)
  status: DispatchOfferStatus;

  @Field({ nullable: true })
  acceptedAt?: Date;

  @Field({ nullable: true })
  declinedAt?: Date;

  @Field({ nullable: true })
  expiredAt?: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
