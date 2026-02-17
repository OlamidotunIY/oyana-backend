import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class KYCDocument {
  @Field(() => ID)
  id: string;

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

  @Field()
  status: string;

  @Field({ nullable: true })
  uploadedBy?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
