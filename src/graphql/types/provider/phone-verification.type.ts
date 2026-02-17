import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType()
export class PhoneVerification {
  @Field(() => ID)
  id: string;

  @Field()
  kycCaseId: string;

  @Field()
  providerId: string;

  @Field()
  phoneNumber: string;

  @Field()
  status: string;

  @Field({ nullable: true })
  verificationCode?: string;

  @Field({ nullable: true })
  codeExpiresAt?: Date;

  @Field(() => Int)
  attempts: number;

  @Field(() => Int)
  maxAttempts: number;

  @Field({ nullable: true })
  verifiedAt?: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
