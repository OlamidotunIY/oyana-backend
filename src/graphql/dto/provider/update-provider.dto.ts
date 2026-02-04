import { InputType, Field, Int, Float } from '@nestjs/graphql';
import { ProviderStatus } from '../../enums';

@InputType()
export class UpdateProviderDto {
  @Field({ nullable: true })
  displayName?: string;

  @Field({ nullable: true })
  contactProfileId?: string;

  @Field(() => ProviderStatus, { nullable: true })
  status?: ProviderStatus;

  @Field({ nullable: true })
  minWalletThresholdMinor?: string;

  @Field(() => Float, { nullable: true })
  ratingAvg?: number;

  @Field(() => Int, { nullable: true })
  ratingCount?: number;

  @Field(() => Int, { nullable: true })
  priorityScore?: number;
}
