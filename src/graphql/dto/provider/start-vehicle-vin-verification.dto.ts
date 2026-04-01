import { Field, InputType } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

@InputType()
export class StartVehicleVinVerificationDto {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  providerId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  vin?: string;
}
