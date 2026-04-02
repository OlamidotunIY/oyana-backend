import { InputType, Field } from '@nestjs/graphql';
import {
  IsDefined,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { GraphQLBigInt } from '../../scalars';

@InputType()
export class CreateShipmentBidDto {
  @Field()
  @IsString()
  @IsNotEmpty()
  shipmentId: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  providerId?: string;

  @Field(() => GraphQLBigInt)
  @IsDefined()
  amountMinor: bigint;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currency?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  message?: string;
}
