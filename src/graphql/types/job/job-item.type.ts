import { ObjectType, Field, ID } from '@nestjs/graphql';
import { GraphQLBigInt } from '../../scalars';

@ObjectType()
export class JobItem {
  @Field(() => ID)
  id: string;

  @Field()
  jobId: string;

  @Field()
  itemCategory: string;

  @Field()
  itemDescription: string;

  @Field()
  quantity: number;

  @Field(() => GraphQLBigInt, { nullable: true })
  declaredValueMinor?: bigint;

  @Field({ nullable: true })
  declaredValueCurrency?: string;

  @Field({ nullable: true })
  weight?: number;

  @Field({ nullable: true })
  length?: number;

  @Field({ nullable: true })
  width?: number;

  @Field({ nullable: true })
  height?: number;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
