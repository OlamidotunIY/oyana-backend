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
export class CreatePaymentIntentDto {
  @Field()
  @IsString()
  @IsNotEmpty()
  walletAccountId: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  provider?: string;

  @Field(() => GraphQLBigInt)
  @IsDefined()
  amountMinor: bigint;

  @Field()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currency: string;
}
