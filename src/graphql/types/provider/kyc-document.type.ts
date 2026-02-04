import { ObjectType, Field, ID } from '@nestjs/graphql';
import { KYCDocumentType, KYCDocumentStatus } from '../../enums';

@ObjectType()
export class KYCDocument {
  @Field(() => ID)
  id: string;

  @Field()
  caseId: string;

  @Field(() => KYCDocumentType)
  documentType: KYCDocumentType;

  @Field()
  uploadUrl: string;

  @Field(() => KYCDocumentStatus)
  status: KYCDocumentStatus;

  @Field({ nullable: true })
  verifiedAt?: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
