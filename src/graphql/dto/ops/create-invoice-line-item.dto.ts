import { Field, InputType, Int } from '@nestjs/graphql';
import { IsDefined, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { GraphQLBigInt } from '../../scalars';

@InputType()
export class CreateInvoiceLineItemDto {
  @Field()
  @IsString()
  @IsNotEmpty()
  description: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @Field(() => GraphQLBigInt)
  @IsDefined()
  unitAmountMinor: bigint;
}
