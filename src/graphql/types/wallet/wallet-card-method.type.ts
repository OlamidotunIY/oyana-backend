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

  @Field({ nullable: true })
  signature?: string;

  @Field({ nullable: true })
  cardType?: string;

  @Field({ nullable: true })
  bank?: string;

  @Field({ nullable: true })
  countryCode?: string;

  @Field({ nullable: true })
  brand?: string;

  @Field({ nullable: true })
  first6?: string;

  @Field({ nullable: true })
  last4?: string;

  @Field({ nullable: true })
  expMonth?: string;

  @Field({ nullable: true })
  expYear?: string;

  @Field(() => Boolean)
  reusable: boolean;

  @Field({ nullable: true })
  customerCode?: string;

  @Field({ nullable: true })
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
