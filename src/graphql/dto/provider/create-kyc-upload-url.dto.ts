import { Field, InputType } from '@nestjs/graphql';
import { GraphQLBigInt } from '../../scalars';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

@InputType()
export class CreateKycUploadUrlDto {
  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  providerId?: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  fileName: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  mimeType?: string;

  @Field(() => GraphQLBigInt, { nullable: true })
  @IsOptional()
  @Min(1)
  sizeBytes?: bigint;
}
