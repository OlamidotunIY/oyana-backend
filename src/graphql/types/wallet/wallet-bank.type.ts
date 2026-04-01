import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class WalletBank {
  @Field()
  name: string;

  @Field()
  code: string;

  @Field(() => String, { nullable: true })
  slug?: string;

  @Field(() => String, { nullable: true })
  longcode?: string;

  @Field(() => String, { nullable: true })
  gateway?: string;

  @Field({ nullable: true })
  payWithBank?: boolean;

  @Field({ nullable: true })
  active?: boolean;

  @Field(() => String, { nullable: true })
  country?: string;

  @Field(() => String, { nullable: true })
  currency?: string;
}
