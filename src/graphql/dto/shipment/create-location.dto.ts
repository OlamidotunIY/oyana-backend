import { InputType, Field } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

@InputType()
export class CreateUserAddressDto {
  @Field()
  @IsString()
  @IsNotEmpty()
  placeId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{2}$/, {
    message: 'countryCode must be a 2-letter ISO code',
  })
  countryCode?: string;
}
