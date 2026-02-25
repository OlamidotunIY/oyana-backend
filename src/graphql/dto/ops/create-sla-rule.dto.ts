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

  @Field({ nullable: true })
  vehicleCategory?: string;

  @Field({ nullable: true })
  providerId?: string;

  @Field({ nullable: true })
  isActive?: boolean;
}
