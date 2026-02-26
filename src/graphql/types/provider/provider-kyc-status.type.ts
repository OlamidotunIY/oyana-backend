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

  @Field()
  vehiclePlateStatus: string;

  @Field()
  vehicleVinStatus: string;

  @Field({ nullable: true })
  ninVerifiedAt?: Date;

  @Field({ nullable: true })
  phoneVerifiedAt?: Date;

  @Field({ nullable: true })
  faceVerifiedAt?: Date;

  @Field({ nullable: true })
  vehiclePlateVerifiedAt?: Date;

  @Field({ nullable: true })
  vehicleVinVerifiedAt?: Date;

  @Field(() => Float, { nullable: true })
  faceConfidence?: number;

  @Field({ nullable: true })
  maskedNin?: string;

  @Field({ nullable: true })
  maskedPhone?: string;

  @Field({ nullable: true })
  failureSummary?: string;

  @Field({ nullable: true })
  lastVendorSyncAt?: Date;

  @Field({ nullable: true })
  lastCheckAt?: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
