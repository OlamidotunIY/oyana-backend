import { InputType, Field } from '@nestjs/graphql';
import { GraphQLBigInt } from '../../scalars';

@InputType()
export class AddJobItemDto {
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
}
