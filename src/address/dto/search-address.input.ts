import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

@InputType()
export class SearchAddressInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  query: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{2}$/, {
    message: 'countryCode must be a 2-letter ISO code',
  })
  countryCode?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  sessionToken?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}
