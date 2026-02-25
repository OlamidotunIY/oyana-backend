import { Field, Int, ObjectType } from '@nestjs/graphql';
import { GraphQLBigInt } from '../../scalars';

@ObjectType()
export class AdminOverview {
  @Field(() => Int)
  totalUsers: number;

  @Field(() => Int)
  activeShipments: number;

  @Field(() => Int)
  openDispatchBatches: number;

  @Field(() => Int)
  openMarketplaceRequests: number;

  @Field(() => Int)
  openSupportTickets: number;

  @Field(() => Int)
  openDisputes: number;

  @Field(() => Int)
  openFraudFlags: number;

  @Field(() => Int)
  pendingKycReviews: number;

  @Field(() => GraphQLBigInt)
  walletBalanceMinor: bigint;

  @Field(() => GraphQLBigInt)
  walletEscrowMinor: bigint;

  @Field()
  currency: string;
}
