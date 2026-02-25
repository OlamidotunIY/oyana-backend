import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class ApproveRefundDto {
  @Field()
  refundId: string;

  @Field()
  approved: boolean;
}
