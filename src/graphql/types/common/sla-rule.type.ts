import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { SLARuleStatus } from '../../enums';

@ObjectType()
export class SLARule {
  @Field(() => ID)
  id: string;

  @Field()
  ruleName: string;

  @Field()
  ruleDescription: string;

  @Field(() => Int)
  thresholdMinutes: number;

  @Field()
  regionId: string;

  @Field(() => SLARuleStatus)
  status: SLARuleStatus;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
