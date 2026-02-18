import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class WalletBank {
  @Field()
  name: string;

  @Field()
  code: string;

  @Field({ nullable: true })
  slug?: string;

  @Field({ nullable: true })
  longcode?: string;

  @Field({ nullable: true })
  gateway?: string;

  @Field({ nullable: true })
  payWithBank?: boolean;

  @Field({ nullable: true })
  active?: boolean;

  @Field({ nullable: true })
  country?: string;

  @Field({ nullable: true })
  currency?: string;
}
