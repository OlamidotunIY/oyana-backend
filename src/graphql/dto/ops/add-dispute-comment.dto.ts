import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AddDisputeCommentDto {
  @Field()
  disputeId: string;

  @Field()
  message: string;
}
