import { InputType, Field } from '@nestjs/graphql';
import { KYCDocumentType } from '../../enums';

@InputType()
export class UploadKYCDocumentDto {
  @Field()
  caseId: string;

  @Field(() => KYCDocumentType)
  documentType: KYCDocumentType;

  @Field()
  uploadUrl: string;
}
