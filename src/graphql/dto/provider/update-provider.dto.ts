import { InputType, Field, Int, Float } from '@nestjs/graphql';
import { ProviderStatus } from '../../enums';
import { GraphQLBigInt } from '../../scalars';

@InputType()
export class UpdateProviderDto {
  @Field(() => String, { nullable: true })
  businessName?: string;

  @Field(() => String, { nullable: true })
  profileId?: string;

  @Field(() => ProviderStatus, { nullable: true })
  status?: ProviderStatus;

  @Field(() => GraphQLBigInt, { nullable: true })
  minWalletThresholdMinor?: bigint;

  @Field(() => Float, { nullable: true })
  ratingAvg?: number;

  @Field(() => Int, { nullable: true })
  ratingCount?: number;

  @Field(() => Int, { nullable: true })
  priorityScore?: number;
}
