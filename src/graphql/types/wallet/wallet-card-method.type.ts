import { Field, ID, ObjectType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';

@ObjectType()
export class WalletCardMethod {
  @Field(() => ID)
  id: string;

  @Field()
  profileId: string;

  @Field()
  walletAccountId: string;

  @Field()
  provider: string;

  @Field(() => String, { nullable: true })
  signature?: string;

  @Field(() => String, { nullable: true })
  cardType?: string;

  @Field(() => String, { nullable: true })
  bank?: string;

  @Field(() => String, { nullable: true })
  countryCode?: string;

  @Field(() => String, { nullable: true })
  brand?: string;

  @Field(() => String, { nullable: true })
  first6?: string;

  @Field(() => String, { nullable: true })
  last4?: string;

  @Field(() => String, { nullable: true })
  expMonth?: string;

  @Field(() => String, { nullable: true })
  expYear?: string;

  @Field(() => Boolean)
  reusable: boolean;

  @Field(() => String, { nullable: true })
  customerCode?: string;

  @Field(() => String, { nullable: true })
  channel?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: Record<string, unknown>;

  @Field({ nullable: true })
  lastUsedAt?: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
