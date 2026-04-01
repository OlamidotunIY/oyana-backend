import { ObjectType, Field, ID } from '@nestjs/graphql';
import { DispatchBatchStatus } from '../../enums';

@ObjectType()
export class DispatchBatch {
  @Field(() => ID)
  id: string;

  @Field()
  shipmentId: string;

  @Field(() => DispatchBatchStatus)
  status: DispatchBatchStatus;

  @Field(() => Date, { nullable: true })
  openedAt?: Date;

  @Field(() => Date, { nullable: true })
  closedAt?: Date;

  @Field(() => Date, { nullable: true })
  expiresAt?: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
