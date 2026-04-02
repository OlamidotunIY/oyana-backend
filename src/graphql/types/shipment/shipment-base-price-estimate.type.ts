import { Field, Float, ObjectType } from '@nestjs/graphql';
import { GraphQLBigInt } from '../../scalars';

@ObjectType()
export class ShipmentBasePriceEstimate {
  @Field(() => String)
  currency: string;

  @Field(() => Float)
  distanceKm: number;

  @Field(() => GraphQLBigInt)
  baseFareMinor: bigint;

  @Field(() => GraphQLBigInt)
  distanceFeeMinor: bigint;

  @Field(() => GraphQLBigInt)
  minimumPriceMinor: bigint;

  @Field(() => GraphQLBigInt)
  basePriceMinor: bigint;
}
