import { InputType, Field, Int } from '@nestjs/graphql';
import { VehicleCategory } from '../../enums';
import { GraphQLBigInt } from '../../scalars';

@InputType()
export class CreateVehicleDto {
  @Field()
  providerId: string;

  @Field(() => VehicleCategory)
  category: VehicleCategory;

  @Field({ nullable: true })
  plateNumber?: string;

  @Field({ nullable: true })
  make?: string;

  @Field({ nullable: true })
  model?: string;

  @Field({ nullable: true })
  color?: string;

  @Field(() => Int, { nullable: true })
  capacityKg?: number;

  @Field(() => GraphQLBigInt, { nullable: true })
  capacityVolumeCm3?: bigint;
}
