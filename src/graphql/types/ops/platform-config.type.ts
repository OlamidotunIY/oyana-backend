import { Field, ID, ObjectType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';

@ObjectType()
export class PlatformConfig {
  @Field(() => ID)
  id: string;

  @Field()
  key: string;

  @Field(() => GraphQLJSON)
  value: unknown;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  updatedByProfileId?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
