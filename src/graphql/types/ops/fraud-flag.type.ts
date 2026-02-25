import { Field, ID, ObjectType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';
import { FraudSeverity, FraudStatus, FraudTargetType } from '../../enums';

@ObjectType()
export class FraudFlag {
  @Field(() => ID)
  id: string;

  @Field()
  flagCode: string;

  @Field(() => FraudTargetType)
  targetType: FraudTargetType;

  @Field()
  targetId: string;

  @Field(() => FraudSeverity)
  severity: FraudSeverity;

  @Field(() => FraudStatus)
  status: FraudStatus;

  @Field()
  reason: string;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: unknown;

  @Field({ nullable: true })
  invoiceId?: string;

  @Field({ nullable: true })
  shipmentId?: string;

  @Field({ nullable: true })
  raisedByProfileId?: string;

  @Field({ nullable: true })
  assignedToProfileId?: string;

  @Field({ nullable: true })
  resolvedByProfileId?: string;

  @Field({ nullable: true })
  resolvedAt?: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
