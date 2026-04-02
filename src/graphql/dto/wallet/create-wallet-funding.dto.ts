import { Field, InputType } from '@nestjs/graphql';
import {
  IsDefined,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { GraphQLBigInt } from '../../scalars';
import { GraphQLJSON } from 'graphql-scalars';

@InputType()
export class CreateWalletFundingInput {
  @Field(() => GraphQLBigInt)
  @IsDefined()
  amountMinor: bigint;

  @Field({ nullable: true, defaultValue: 'NGN' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currency?: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  savedCardMethodId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  callbackUrl?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  metadata?: Record<string, unknown>;
}
