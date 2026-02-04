import { ObjectType, Field, ID } from '@nestjs/graphql';
import { JobMilestoneType, JobMilestoneStatus } from '../../enums';
import { GraphQLBigInt } from '../../scalars';

@ObjectType()
export class JobMilestone {
  @Field(() => ID)
  id: string;

  @Field()
  jobId: string;

  @Field(() => JobMilestoneType)
  milestoneType: JobMilestoneType;

  @Field()
  expectedTimestamp: Date;

  @Field({ nullable: true })
  actualTimestamp?: Date;

  @Field(() => JobMilestoneStatus)
  status: JobMilestoneStatus;

  @Field(() => GraphQLBigInt, { nullable: true })
  penaltyAmountMinor?: bigint;

  @Field({ nullable: true })
  notes?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
