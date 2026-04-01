import { InputType, Field } from '@nestjs/graphql';
import { GraphQLBigInt } from '../../scalars';

@InputType()
export class CreateShipmentBidDto {
  @Field()
  shipmentId: string;

  @Field(() => String, { nullable: true })
  providerId?: string;

  @Field(() => GraphQLBigInt)
  amountMinor: bigint;

  @Field(() => String, { nullable: true })
  currency?: string;

  @Field(() => String, { nullable: true })
  message?: string;
}
