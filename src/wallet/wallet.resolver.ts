import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import {
  WalletAccount,
  Transaction,
} from '../graphql';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Resolver(() => WalletAccount)
export class WalletResolver {
  constructor(private readonly walletService: WalletService) {}

  @Query(() => WalletAccount, { nullable: true })
  @UseGuards(GqlAuthGuard)
  async myWallet(@CurrentUser() user: any): Promise<WalletAccount | null> {
    if (!user?.id) {
      return null;
    }

    // Try to get existing wallet
    let wallet = await this.walletService.getWalletByOwnerId(
      user.id,
    );

    return wallet;
  }

  @Query(() => [Transaction])
  @UseGuards(GqlAuthGuard)
  async walletTransactions(
    @Args('walletAccountId') walletAccountId: string,
  ): Promise<Transaction[]> {
    return this.walletService.getWalletTransactions(walletAccountId);
  }
}
