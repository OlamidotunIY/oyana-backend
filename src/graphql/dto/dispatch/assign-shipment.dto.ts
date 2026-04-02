import { InputType, Field } from '@nestjs/graphql';
import { GraphQLBigInt } from '../../scalars';

@InputType()
export class AssignShipmentDto {
  @Field()
  shipmentId: string;

  @Field()
  providerId: string;

  @Field(() => String, { nullable: true })
  driverProfileId?: string;

  @Field(() => String, { nullable: true })
  dispatchOfferId?: string;

  @Field(() => GraphQLBigInt, { nullable: true })
  agreedPriceMinor?: bigint;

  @Field(() => String, { nullable: true })
  currency?: string;
}
