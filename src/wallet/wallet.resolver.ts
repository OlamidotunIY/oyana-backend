import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import {
  WalletAccount,
  Transaction,
  PaymentIntent,
  Refund,
  CreateWalletAccountDto,
  CreateTransactionDto,
  CreatePaymentIntentDto,
  RequestRefundDto,
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
      'customer',
      user.id,
    );

    // Auto-create wallet if it doesn't exist
    if (!wallet) {
      wallet = await this.walletService.createWalletForProfile(user.id);
    }

    return wallet;
  }

  @Query(() => [Transaction])
  @UseGuards(GqlAuthGuard)
  async walletTransactions(
    @Args('walletAccountId') walletAccountId: string,
  ): Promise<Transaction[]> {
    return this.walletService.getWalletTransactions(walletAccountId);
  }

  @Mutation(() => PaymentIntent)
  async updatePaymentIntent(@Args('id') id: string): Promise<PaymentIntent> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  @Mutation(() => Refund)
  async initiateRefund(
    @Args('input') input: RequestRefundDto,
  ): Promise<Refund> {
    // TODO: Implement
    throw new Error('Not implemented');
  }
}
