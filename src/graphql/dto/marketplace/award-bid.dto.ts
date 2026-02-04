import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class AwardBidDto {
  @Field()
  bidId: string;

  @Field()
  jobId: string;

  @Field()
  providerId: string;
}
