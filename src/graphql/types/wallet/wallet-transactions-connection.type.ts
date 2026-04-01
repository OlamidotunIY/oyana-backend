import { Field, ObjectType } from '@nestjs/graphql';
import { Transaction } from './transaction.type';

@ObjectType()
export class WalletTransactionsConnection {
  @Field(() => [Transaction])
  items: Transaction[];

  @Field(() => String, { nullable: true })
  nextCursor?: string;

  @Field(() => Boolean)
  hasMore: boolean;
}
