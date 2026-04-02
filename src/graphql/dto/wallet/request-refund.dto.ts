import { InputType, Field } from '@nestjs/graphql';
import { IsDefined, IsNotEmpty, IsString, Matches } from 'class-validator';
import { GraphQLBigInt } from '../../scalars';

@InputType()
export class RequestRefundDto {
  @Field()
  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  shipmentId: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  initiatedByProfileId: string;

  @Field(() => GraphQLBigInt)
  @IsDefined()
  amountMinor: bigint;

  @Field()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currency: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  reason: string;
}
