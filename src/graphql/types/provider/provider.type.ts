import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';
import { ProviderType, ProviderStatus } from '../../enums';

@ObjectType()
export class Provider {
  @Field(() => ID)
  id: string;

  @Field(() => ProviderType)
  type: ProviderType;

  @Field()
  legalName: string;

  @Field({ nullable: true })
  displayName?: string;

  @Field({ nullable: true })
  contactProfileId?: string;

  @Field(() => ProviderStatus)
  status: ProviderStatus;

  @Field()
  minWalletThresholdMinor: string;

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
