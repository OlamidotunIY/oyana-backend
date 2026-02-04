import { ObjectType, Field, ID } from '@nestjs/graphql';
import { WalletAccountStatus } from '../../enums';
import { GraphQLBigInt } from '../../scalars';

@ObjectType()
export class WalletAccount {
  @Field(() => ID)
  id: string;

  @Field()
  profileId: string;

  @Field(() => GraphQLBigInt)
  balanceMinor: bigint;

  @Field()
  currency: string;

  @Field(() => GraphQLBigInt)
  escrowMinor: bigint;

  @Field(() => WalletAccountStatus)
  status: WalletAccountStatus;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
