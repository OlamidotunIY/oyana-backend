import { Field, InputType, Int } from '@nestjs/graphql';
import { VehicleCategory } from '../../enums';

@InputType()
export class MarketplaceShipmentsFilterDto {
  @Field({ nullable: true })
  routeQuery?: string;

  @Field({ nullable: true })
  cargoQuery?: string;

  @Field({ nullable: true })
  scheduledFrom?: Date;

  @Field({ nullable: true })
  scheduledTo?: Date;

  @Field(() => Int, { nullable: true })
  distanceKmMax?: number;

  @Field(() => [VehicleCategory], { nullable: true })
  vehicleCategories?: VehicleCategory[];

  @Field({ nullable: true })
  cursor?: string;

  @Field(() => Int, { nullable: true })
  take?: number;
}
