import { ObjectType, Field, ID } from '@nestjs/graphql';
import { NINVerificationStatus } from '../../enums';
import { GraphQLJSON } from 'graphql-scalars';

@ObjectType()
export class NINVerification {
  @Field(() => ID)
  id: string;

  @Field()
  profileId: string;

  @Field()
  ninNumber: string;

  @Field({ nullable: true })
  firstName?: string;

  @Field({ nullable: true })
  lastName?: string;

  @Field({ nullable: true })
  middleName?: string;

  @Field({ nullable: true })
  dateOfBirth?: Date;

  @Field({ nullable: true })
  gender?: string;

  @Field(() => NINVerificationStatus)
  verificationStatus: NINVerificationStatus;

  @Field({ nullable: true })
  verifiedAt?: Date;

  @Field(() => GraphQLJSON, { nullable: true })
  rawResponseData?: any;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
