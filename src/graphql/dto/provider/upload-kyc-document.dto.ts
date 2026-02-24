import { InputType, Field } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

@InputType()
export class UploadKYCDocumentDto {
  @Field()
  @IsUUID()
  kycCaseId: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  docType: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  storageBucket: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  storagePath: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  mimeType?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  uploadedBy?: string;
}
