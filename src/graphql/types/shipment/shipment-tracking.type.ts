import { Field, ObjectType } from '@nestjs/graphql';
import { ShipmentMilestone } from '../common/shipment-milestone.type';
import { Shipment } from './shipment.type';
import { ShipmentEvent } from './shipment-event.type';

@ObjectType()
export class ShipmentTracking {
  @Field(() => Shipment)
  shipment: Shipment;

  @Field(() => [ShipmentEvent])
  events: ShipmentEvent[];

  @Field(() => [ShipmentMilestone])
  milestones: ShipmentMilestone[];
}
