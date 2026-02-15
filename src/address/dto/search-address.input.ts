import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class SearchAddressInput {
  @Field()
  query: string;

  @Field({ nullable: true })
  countryCode?: string;

  @Field({ nullable: true })
  sessionToken?: string;

  @Field(() => Int, { nullable: true })
  limit?: number;
}
