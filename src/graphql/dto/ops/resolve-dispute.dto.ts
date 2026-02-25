import { Field, InputType } from '@nestjs/graphql';
import { DisputeStatus } from '../../enums';

@InputType()
export class ResolveDisputeDto {
  @Field()
  disputeId: string;

  @Field()
  resolutionSummary: string;

  @Field(() => DisputeStatus, { nullable: true })
  status?: DisputeStatus;
}
