import { Field, Float, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';

@InputType()
export class EstimateShipmentBasePriceDto {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  pickupAddressId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  dropoffAddressId?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  pickupLat?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  pickupLng?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  dropoffLat?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  dropoffLng?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{3}$/, {
    message: 'currency must be a 3-letter ISO code',
  })
  currency?: string;
}
