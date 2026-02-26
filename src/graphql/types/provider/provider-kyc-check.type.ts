import { Field, Float, ID, ObjectType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';

@ObjectType()
export class ProviderKycCheck {
  @Field(() => ID)
  id: string;

  @Field()
  providerId: string;

  @Field({ nullable: true })
  profileId?: string;

  @Field({ nullable: true })
  vehicleId?: string;

  @Field()
  checkType: string;

  @Field()
  status: string;

  @Field()
  vendor: string;

  @Field({ nullable: true })
  vendorReference?: string;

  @Field({ nullable: true })
  responseCode?: string;

  @Field(() => Float, { nullable: true })
  confidence?: number;

  @Field({ nullable: true })
  message?: string;

  @Field({ nullable: true })
  maskedIdentifier?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  normalizedData?: unknown;

  @Field({ nullable: true })
  expiresAt?: Date;

  @Field({ nullable: true })
  verifiedAt?: Date;

  @Field({ nullable: true })
  failedAt?: Date;

  @Field({ nullable: true })
  initiatedByProfileId?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
