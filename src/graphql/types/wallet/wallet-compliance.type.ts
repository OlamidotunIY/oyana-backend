import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class WalletCompliance {
  @Field(() => Boolean)
  phoneVerified: boolean;

  @Field(() => Boolean)
  canFund: boolean;

  @Field(() => Boolean)
  canWithdraw: boolean;

  @Field(() => [String])
  blockReasons: string[];
}
