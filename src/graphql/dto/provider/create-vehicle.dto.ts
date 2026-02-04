import { InputType, Field } from '@nestjs/graphql';
import { VehicleType } from '../../enums';

@InputType()
export class CreateVehicleDto {
  @Field()
  providerId: string;

  @Field()
  registrationNumber: string;

  @Field(() => VehicleType)
  vehicleType: VehicleType;

  @Field({ nullable: true })
  make?: string;

  @Field({ nullable: true })
  model?: string;

  @Field({ nullable: true })
  year?: number;

  @Field({ nullable: true })
  color?: string;
}
