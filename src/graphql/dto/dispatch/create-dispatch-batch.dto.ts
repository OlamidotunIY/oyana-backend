import { InputType, Field } from '@nestjs/graphql';
import { GraphQLBigInt } from '../../scalars';

@InputType()
export class CreateDispatchBatchDto {
  @Field()
  createdByProfileId: string;

  @Field()
  regionId: string;

  @Field(() => GraphQLBigInt)
  totalValueMinor: bigint;

  @Field()
  currency: string;
}
