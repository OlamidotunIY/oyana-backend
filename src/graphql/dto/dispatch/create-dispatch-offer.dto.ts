import { InputType, Field } from '@nestjs/graphql';
import { GraphQLBigInt } from '../../scalars';

@InputType()
export class CreateDispatchOfferDto {
  @Field()
  batchId: string;

  @Field()
  providerId: string;

  @Field()
  jobId: string;

  @Field(() => GraphQLBigInt)
  offeredPriceMinor: bigint;

  @Field()
  currency: string;
}
