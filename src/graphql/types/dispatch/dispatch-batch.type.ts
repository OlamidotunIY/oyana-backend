import { ObjectType, Field, ID } from '@nestjs/graphql';
import { DispatchBatchStatus } from '../../enums';
import { GraphQLBigInt } from '../../scalars';

@ObjectType()
export class DispatchBatch {
  @Field(() => ID)
  id: string;

  @Field()
  createdByProfileId: string;

  @Field()
  regionId: string;

  @Field(() => DispatchBatchStatus)
  status: DispatchBatchStatus;

  @Field({ nullable: true })
  completedAt?: Date;

  @Field(() => GraphQLBigInt)
  totalValueMinor: bigint;

  @Field()
  currency: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
