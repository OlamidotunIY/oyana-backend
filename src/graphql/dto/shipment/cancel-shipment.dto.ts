import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CancelShipmentDto {
  @Field()
  shipmentId: string;

  @Field()
  cancellationReason: string;
}
