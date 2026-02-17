import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { KYCCaseStatus } from '../../enums';

@ObjectType()
export class KYCCase {
  @Field(() => ID)
  id: string;

  @Field()
  providerId: string;

  @Field(() => KYCCaseStatus)
  status: KYCCaseStatus;

  @Field(() => Int)
  kycLevel: number;

  @Field()
  ninVerified: boolean;

  @Field()
  phoneVerified: boolean;

  @Field()
  faceVerified: boolean;

  @Field()
  vehicleVerified: boolean;

  @Field()
  documentsVerified: boolean;

  @Field({ nullable: true })
  submittedAt?: Date;

  @Field({ nullable: true })
  rejectionReason?: string;

  @Field({ nullable: true })
  reviewedBy?: string;

  @Field({ nullable: true })
  reviewedAt?: Date;

  @Field({ nullable: true })
  lastVerificationAttempt?: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
