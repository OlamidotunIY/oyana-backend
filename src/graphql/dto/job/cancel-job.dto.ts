import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CancelJobDto {
  @Field()
  jobId: string;

  @Field()
  cancelReason: string;
}
