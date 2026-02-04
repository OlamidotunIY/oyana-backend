import { InputType, Field } from '@nestjs/graphql';
import { GraphQLBigInt } from '../../scalars';

@InputType()
export class AssignJobDto {
  @Field()
  jobId: string;

  @Field()
  providerId: string;

  @Field({ nullable: true })
  dispatchOfferId?: string;

  @Field(() => GraphQLBigInt)
  agreedPriceMinor: bigint;

  @Field()
  currency: string;
}
