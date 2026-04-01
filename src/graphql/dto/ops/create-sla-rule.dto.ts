import { Field, InputType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';
import { SlaRuleScope } from '../../enums';

@InputType()
export class CreateSlaRuleDto {
  @Field()
  key: string;

  @Field(() => SlaRuleScope)
  scope: SlaRuleScope;

  @Field(() => GraphQLJSON)
  value: unknown;

  @Field(() => String, { nullable: true })
  vehicleCategory?: string;

  @Field(() => String, { nullable: true })
  providerId?: string;

  @Field(() => Boolean, { nullable: true })
  isActive?: boolean;
}
