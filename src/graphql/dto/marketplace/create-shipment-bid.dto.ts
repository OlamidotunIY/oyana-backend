import { InputType, Field } from '@nestjs/graphql';
import { GraphQLBigInt } from '../../scalars';

@InputType()
export class CreateShipmentBidDto {
  @Field()
  shipmentId: string;

  @Field({ nullable: true })
  providerId?: string;

  @Field(() => GraphQLBigInt)
  amountMinor: bigint;

  @Field({ nullable: true })
  currency?: string;

  @Field({ nullable: true })
  message?: string;
}
