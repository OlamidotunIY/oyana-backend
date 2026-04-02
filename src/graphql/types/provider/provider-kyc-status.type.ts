import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ProviderKycStatus {
  @Field(() => ID)
  id: string;

  @Field()
  providerId: string;

  @Field()
  overallStatus: string;

  @Field(() => Int)
  kycLevel: number;

  @Field()
  ninStatus: string;

  @Field()
  phoneStatus: string;

  @Field()
  faceStatus: string;

  @Field(() => Date, { nullable: true })
  ninVerifiedAt?: Date;

  @Field(() => Date, { nullable: true })
  phoneVerifiedAt?: Date;

  @Field(() => Date, { nullable: true })
  faceVerifiedAt?: Date;

  @Field(() => Float, { nullable: true })
  faceConfidence?: number;

  @Field(() => String, { nullable: true })
  maskedNin?: string;

  @Field(() => String, { nullable: true })
  maskedPhone?: string;

  @Field(() => String, { nullable: true })
  failureSummary?: string;

  @Field(() => Date, { nullable: true })
  lastVendorSyncAt?: Date;

  @Field(() => Date, { nullable: true })
  lastCheckAt?: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
