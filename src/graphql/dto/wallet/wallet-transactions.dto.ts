import { Field, InputType, Int } from '@nestjs/graphql';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import {
  TransactionDirection,
  TransactionStatus,
  TransactionType,
} from '../../enums';

@InputType()
export class WalletTransactionsInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  cursor?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  take?: number;

  @Field(() => TransactionDirection, { nullable: true })
  @IsOptional()
  @IsEnum(TransactionDirection)
  direction?: TransactionDirection;

  @Field(() => TransactionStatus, { nullable: true })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @Field(() => TransactionType, { nullable: true })
  @IsOptional()
  @IsEnum(TransactionType)
  transactionType?: TransactionType;
}
