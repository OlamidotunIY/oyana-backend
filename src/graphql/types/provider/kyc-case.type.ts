import { ObjectType, Field, ID } from '@nestjs/graphql';
import { KYCCaseType, KYCCaseStatus } from '../../enums';

@ObjectType()
export class KYCCase {
  @Field(() => ID)
  id: string;

  @Field()
  providerId: string;

  @Field(() => KYCCaseType)
  caseType: KYCCaseType;

  @Field(() => KYCCaseStatus)
  status: KYCCaseStatus;

  @Field({ nullable: true })
  rejectionReason?: string;

  @Field({ nullable: true })
  reviewedBy?: string;

  @Field({ nullable: true })
  reviewedAt?: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
