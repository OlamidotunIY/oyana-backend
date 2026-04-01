import { Field, Float, ID, ObjectType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';

@ObjectType()
export class ProviderKycCheck {
  @Field(() => ID)
  id: string;

  @Field()
  providerId: string;

  @Field(() => String, { nullable: true })
  profileId?: string;

  @Field(() => String, { nullable: true })
  vehicleId?: string;

  @Field()
  checkType: string;

  @Field()
  status: string;

  @Field()
  vendor: string;

  @Field(() => String, { nullable: true })
  vendorReference?: string;

  @Field(() => String, { nullable: true })
  responseCode?: string;

  @Field(() => Float, { nullable: true })
  confidence?: number;

  @Field(() => String, { nullable: true })
  message?: string;

  @Field(() => String, { nullable: true })
  maskedIdentifier?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  normalizedData?: unknown;

  @Field({ nullable: true })
  expiresAt?: Date;

  @Field({ nullable: true })
  verifiedAt?: Date;

  @Field({ nullable: true })
  failedAt?: Date;

  @Field(() => String, { nullable: true })
  initiatedByProfileId?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
