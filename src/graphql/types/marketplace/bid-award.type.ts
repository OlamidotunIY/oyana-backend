import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class BidAward {
  @Field(() => ID)
  id: string;

  @Field()
  bidId: string;

  @Field()
  jobId: string;

  @Field()
  providerId: string;

  @Field()
  awardedAt: Date;

  @Field()
  createdAt: Date;
}
