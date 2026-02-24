import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import {
  ConfirmWalletFundingInput,
  CreateWalletFundingInput,
  CreateWalletWithdrawalInput,
  Transaction,
  WalletAccount,
  WalletBank,
  WalletCardMethod,
  WalletCompliance,
  WalletFundingResult,
  WalletSavedBankAccount,
  WalletTransactionsConnection,
  WalletTransactionsInput,
  WalletWithdrawal,
} from '../graphql';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SupabaseUser } from '../auth/supabase/supabase.types';

@Resolver(() => WalletAccount)
export class WalletResolver {
  constructor(private readonly walletService: WalletService) {}

  @Query(() => WalletAccount, { nullable: true })
  @UseGuards(GqlAuthGuard)
  async myWallet(@CurrentUser() user: SupabaseUser): Promise<WalletAccount | null> {
    if (!user?.id) {
      return null;
    }

    return this.walletService.getWalletByOwnerId(user.id);
  }

  @Query(() => WalletCompliance)
  @UseGuards(GqlAuthGuard)
  async myWalletCompliance(
    @CurrentUser() user: SupabaseUser,
  ): Promise<WalletCompliance> {
    return this.walletService.getWalletCompliance(user.id);
  }

  @Query(() => [WalletCardMethod])
  @UseGuards(GqlAuthGuard)
  async mySavedFundingCards(
    @CurrentUser() user: SupabaseUser,
  ): Promise<WalletCardMethod[]> {
    return this.walletService.getSavedFundingCards(user.id);
  }

  @Query(() => [WalletSavedBankAccount])
  @UseGuards(GqlAuthGuard)
  async mySavedWithdrawalAccounts(
    @CurrentUser() user: SupabaseUser,
  ): Promise<WalletSavedBankAccount[]> {
    return this.walletService.getSavedWithdrawalAccounts(user.id);
  }

  @Query(() => [WalletBank])
  @UseGuards(GqlAuthGuard)
  async paystackSupportedBanks(
    @Args('countryCode', { nullable: true }) countryCode?: string,
  ): Promise<WalletBank[]> {
    return this.walletService.paystackSupportedBanks(countryCode);
  }

  @Query(() => WalletTransactionsConnection)
  @UseGuards(GqlAuthGuard)
  async myWalletTransactions(
    @CurrentUser() user: SupabaseUser,
    @Args('input', { nullable: true }) input?: WalletTransactionsInput,
  ): Promise<WalletTransactionsConnection> {
    return this.walletService.getMyWalletTransactions(user.id, input);
  }

  @Query(() => [Transaction])
  @UseGuards(GqlAuthGuard)
  async walletTransactions(
    @CurrentUser() user: SupabaseUser,
    @Args('walletAccountId') walletAccountId: string,
  ): Promise<Transaction[]> {
    return this.walletService.getWalletTransactions(user.id, walletAccountId);
  }

  @Mutation(() => WalletFundingResult)
  @UseGuards(GqlAuthGuard)
  async createWalletFunding(
    @CurrentUser() user: SupabaseUser,
    @Args('input') input: CreateWalletFundingInput,
  ): Promise<WalletFundingResult> {
    return this.walletService.createWalletFunding(user.id, input);
  }

  @Mutation(() => WalletFundingResult)
  @UseGuards(GqlAuthGuard)
  async confirmWalletFunding(
    @CurrentUser() user: SupabaseUser,
    @Args('input') input: ConfirmWalletFundingInput,
  ): Promise<WalletFundingResult> {
    return this.walletService.confirmWalletFunding(user.id, input);
  }

  @Mutation(() => WalletWithdrawal)
  @UseGuards(GqlAuthGuard)
  async createWalletWithdrawal(
    @CurrentUser() user: SupabaseUser,
    @Args('input') input: CreateWalletWithdrawalInput,
  ): Promise<WalletWithdrawal> {
    return this.walletService.createWalletWithdrawal(user.id, input);
  }
}
