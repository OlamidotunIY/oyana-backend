import { ObjectType, Field, ID, Float } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';

@ObjectType()
export class FaceVerification {
  @Field(() => ID)
  id: string;

  @Field()
  kycCaseId: string;

  @Field()
  providerId: string;

  @Field()
  status: string;

  @Field({ nullable: true })
  vendor?: string;

  @Field({ nullable: true })
  vendorReference?: string;

  @Field({ nullable: true })
  faceImageUrl?: string;

  @Field(() => Float, { nullable: true })
  livenessScore?: number;

  @Field(() => Float, { nullable: true })
  matchScore?: number;

  @Field({ nullable: true })
  verifiedAt?: Date;

  @Field({ nullable: true })
  failureReason?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  rawResponse?: any;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
