import { Field, InputType } from '@nestjs/graphql';
import {
  IsBoolean,
  IsDefined,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
} from 'class-validator';
import { GraphQLBigInt } from '../../scalars';

@InputType()
export class CreateWalletWithdrawalInput {
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
  reason?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  savedBankAccountId?: string;

  @Field(() => String, { nullable: true })
  @ValidateIf((input: CreateWalletWithdrawalInput) => !input.savedBankAccountId)
  @IsString()
  @IsNotEmpty()
  bankCode?: string;

  @Field(() => String, { nullable: true })
  @ValidateIf((input: CreateWalletWithdrawalInput) => !input.savedBankAccountId)
  @IsString()
  @Matches(/^\d{10}$/)
  accountNumber?: string;

  @Field({ nullable: true, defaultValue: false })
  @IsOptional()
  @IsBoolean()
  saveAccount?: boolean;
}
