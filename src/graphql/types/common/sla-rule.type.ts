import { ObjectType, Field, ID } from '@nestjs/graphql';
import { SlaRuleScope } from '../../enums';
import { GraphQLJSON } from 'graphql-scalars';

@ObjectType()
export class SLARule {
  @Field(() => ID)
  id: string;

  @Field()
  key: string;

  @Field(() => SlaRuleScope)
  scope: SlaRuleScope;

  @Field(() => String, { nullable: true })
  vehicleCategory?: string;

  @Field(() => String, { nullable: true })
  providerId?: string;

  @Field(() => GraphQLJSON)
  value: any;

  @Field()
  isActive: boolean;

  @Field()
  createdAt: Date;
}
