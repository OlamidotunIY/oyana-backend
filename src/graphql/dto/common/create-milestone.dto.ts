import { InputType, Field } from '@nestjs/graphql';
import { JobMilestoneType } from '../../enums';

@InputType()
export class CreateMilestoneDto {
  @Field()
  jobId: string;

  @Field(() => JobMilestoneType)
  milestoneType: JobMilestoneType;

  @Field()
  expectedTimestamp: Date;

  @Field({ nullable: true })
  notes?: string;
}
