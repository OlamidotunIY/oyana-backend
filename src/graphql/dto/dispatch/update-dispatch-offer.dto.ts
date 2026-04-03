import { Field, InputType, Int } from '@nestjs/graphql';
import { IsOptional, IsString, Matches } from 'class-validator';
import { DispatchOfferStatus } from '../../enums';
import { GraphQLBigInt } from '../../scalars';

@InputType()
export class UpdateDispatchOfferDto {
  @Field()
  offerId: string;

  @Field(() => DispatchOfferStatus)
  status: DispatchOfferStatus;

  @Field(() => Date, { nullable: true })
  respondedAt?: Date;

  @Field(() => Int, { nullable: true })
  providerEtaMinutes?: number;

  @Field(() => GraphQLBigInt, { nullable: true })
  @IsOptional()
  counterAmountMinor?: bigint;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{3}$/, {
    message: 'counterCurrency must be a 3-letter ISO code',
  })
  counterCurrency?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  counterMessage?: string;
}
