import { InputType, Field } from '@nestjs/graphql';
import { ShipmentMilestoneType } from '../../enums';
import { GraphQLJSON } from 'graphql-scalars';

@InputType()
export class CreateMilestoneDto {
  @Field()
  shipmentId: string;

  @Field(() => ShipmentMilestoneType)
  milestoneType: ShipmentMilestoneType;

  @Field(() => Date, { nullable: true })
  occurredAt?: Date;

  @Field(() => Float, { nullable: true })
  lat?: number;

  @Field(() => Float, { nullable: true })
  lng?: number;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: any;
}
