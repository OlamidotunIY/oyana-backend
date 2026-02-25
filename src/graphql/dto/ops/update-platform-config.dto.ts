import { Field, InputType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';

@InputType()
export class UpdatePlatformConfigDto {
  @Field()
  key: string;

  @Field(() => GraphQLJSON)
  value: unknown;

  @Field({ nullable: true })
  description?: string;
}
