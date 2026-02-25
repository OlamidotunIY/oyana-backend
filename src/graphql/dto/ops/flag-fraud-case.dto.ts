import { Field, InputType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';
import { FraudSeverity, FraudTargetType } from '../../enums';

@InputType()
export class FlagFraudCaseDto {
  @Field(() => FraudTargetType)
  targetType: FraudTargetType;

  @Field()
  targetId: string;

  @Field(() => FraudSeverity, { nullable: true })
  severity?: FraudSeverity;

  @Field()
  reason: string;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: unknown;

  @Field({ nullable: true })
  invoiceId?: string;

  @Field({ nullable: true })
  shipmentId?: string;
}
