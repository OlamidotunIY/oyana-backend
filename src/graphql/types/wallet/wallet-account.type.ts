import { ObjectType, Field, ID } from '@nestjs/graphql';
import { WalletAccountStatus } from '../../enums';
import { GraphQLBigInt } from '../../scalars';

@ObjectType()
export class WalletAccount {
  @Field(() => ID)
  id: string;

  @Field(() => String, { nullable: true })
  ownerProfileId?: string;

  @Field()
  currency: string;

  @Field(() => GraphQLBigInt)
  balanceMinor: bigint;

  @Field(() => GraphQLBigInt)
  escrowMinor: bigint;

  @Field(() => WalletAccountStatus)
  status: WalletAccountStatus;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
