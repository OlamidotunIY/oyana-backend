import { InputType, Field } from '@nestjs/graphql';
import { GraphQLBigInt } from '../../scalars';

@InputType()
export class AssignShipmentDto {
  @Field()
  shipmentId: string;

  @Field()
  providerId: string;

  @Field({ nullable: true })
  vehicleId?: string;

  @Field({ nullable: true })
  driverProfileId?: string;

  @Field({ nullable: true })
  dispatchOfferId?: string;

  @Field(() => GraphQLBigInt, { nullable: true })
  agreedPriceMinor?: bigint;

  @Field({ nullable: true })
  currency?: string;
}
