import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class VerifyNINDto {
  @Field()
  profileId: string;

  @Field()
  ninNumber: string;

  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field({ nullable: true })
  middleName?: string;

  @Field()
  dateOfBirth: Date;

  @Field({ nullable: true })
  gender?: string;
}
