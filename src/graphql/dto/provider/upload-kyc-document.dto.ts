import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class UploadKYCDocumentDto {
  @Field()
  kycCaseId: string;

  @Field()
  docType: string;

  @Field()
  storageBucket: string;

  @Field()
  storagePath: string;

  @Field({ nullable: true })
  mimeType?: string;

  @Field({ nullable: true })
  uploadedBy?: string;
}
