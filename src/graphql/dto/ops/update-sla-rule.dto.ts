import { Field, InputType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';

@InputType()
export class UpdateSlaRuleDto {
  @Field()
  id: string;

  @Field(() => GraphQLJSON, { nullable: true })
  value?: unknown;

  @Field(() => Boolean, { nullable: true })
  isActive?: boolean;
}
