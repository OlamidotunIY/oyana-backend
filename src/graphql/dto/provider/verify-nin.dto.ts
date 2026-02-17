import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class VerifyNINDto {
  @Field()
  kycCaseId: string;

  @Field()
  providerId: string;

  @Field()
  ninHash: string;

  @Field({ nullable: true })
  firstName?: string;

  @Field({ nullable: true })
  lastName?: string;

  @Field({ nullable: true })
  dateOfBirth?: Date;
}
