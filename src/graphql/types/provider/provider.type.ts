import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';
import { GraphQLBigInt } from '../../scalars';
import { ProviderStatus } from '../../enums';

@ObjectType()
export class Provider {
  @Field(() => ID)
  id: string;

  @Field()
  businessName: string;

  @Field(() => String, { nullable: true })
  profileId?: string;

  @Field(() => ProviderStatus)
  status: ProviderStatus;

  @Field(() => GraphQLBigInt)
  minWalletThresholdMinor: bigint;

  @Field(() => Float)
  ratingAvg: number;

  @Field(() => Int)
  ratingCount: number;

  @Field(() => Int)
  priorityScore: number;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
