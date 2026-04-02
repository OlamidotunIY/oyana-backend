import { InputType, Field } from '@nestjs/graphql';
import { TransactionDirection, TransactionType } from '../../enums';
import { GraphQLBigInt } from '../../scalars';
import { GraphQLJSON } from 'graphql-scalars';
import {
  IsDefined,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

@InputType()
export class CreateTransactionDto {
  @Field()
  @IsString()
  @IsNotEmpty()
  walletAccountId: string;

  @Field(() => TransactionDirection)
  @IsEnum(TransactionDirection)
  direction: TransactionDirection;

  @Field(() => TransactionType)
  @IsEnum(TransactionType)
  transactionType: TransactionType;

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
  reference: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  status?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  shipmentId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  paymentIntentId?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  metadata?: any;
}
