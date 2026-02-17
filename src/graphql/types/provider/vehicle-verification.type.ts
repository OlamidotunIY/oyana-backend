import { ObjectType, Field, ID } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';

@ObjectType()
export class VehicleVerification {
  @Field(() => ID)
  id: string;

  @Field()
  kycCaseId: string;

  @Field()
  providerId: string;

  @Field({ nullable: true })
  vehicleId?: string;

  @Field()
  plateNumber: string;

  @Field()
  status: string;

  @Field({ nullable: true })
  vendor?: string;

  @Field({ nullable: true })
  vendorReference?: string;

  @Field()
  registrationVerified: boolean;

  @Field()
  insuranceVerified: boolean;

  @Field()
  roadworthinessVerified: boolean;

  @Field({ nullable: true })
  verifiedAt?: Date;

  @Field({ nullable: true })
  expiresAt?: Date;

  @Field({ nullable: true })
  failureReason?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  rawResponse?: any;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
