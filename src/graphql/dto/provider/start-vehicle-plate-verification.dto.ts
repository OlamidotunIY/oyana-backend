import { Field, InputType } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

@InputType()
export class StartVehiclePlateVerificationDto {
  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  providerId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(24)
  plateNumber?: string;
}
