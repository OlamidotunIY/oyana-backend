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
import { Roles } from '../auth/decorators/roles.decorator';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SupabaseUser } from '../auth/supabase/supabase.types';
import { UserType } from '../graphql/enums';

@Resolver(() => WalletAccount)
export class WalletResolver {
  constructor(private readonly walletService: WalletService) {}

  @Query(() => WalletAccount, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.INDIVIDUAL, UserType.BUSINESS)
  async myWallet(@CurrentUser() user: SupabaseUser): Promise<WalletAccount | null> {
    if (!user?.id) {
      return null;
    }

    return this.walletService.getWalletByOwnerId(user.id);
  }

  @Query(() => WalletCompliance)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.INDIVIDUAL, UserType.BUSINESS)
  async myWalletCompliance(
    @CurrentUser() user: SupabaseUser,
  ): Promise<WalletCompliance> {
    return this.walletService.getWalletCompliance(user.id);
  }

  @Query(() => [WalletCardMethod])
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.INDIVIDUAL, UserType.BUSINESS)
  async mySavedFundingCards(
    @CurrentUser() user: SupabaseUser,
  ): Promise<WalletCardMethod[]> {
    return this.walletService.getSavedFundingCards(user.id);
  }

  @Query(() => [WalletSavedBankAccount])
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.INDIVIDUAL, UserType.BUSINESS)
  async mySavedWithdrawalAccounts(
    @CurrentUser() user: SupabaseUser,
  ): Promise<WalletSavedBankAccount[]> {
    return this.walletService.getSavedWithdrawalAccounts(user.id);
  }

  @Query(() => [WalletBank])
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.INDIVIDUAL, UserType.BUSINESS)
  async paystackSupportedBanks(
    @Args('countryCode', { nullable: true }) countryCode?: string,
  ): Promise<WalletBank[]> {
    return this.walletService.paystackSupportedBanks(countryCode);
  }

  @Query(() => WalletTransactionsConnection)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.INDIVIDUAL, UserType.BUSINESS)
  async myWalletTransactions(
    @CurrentUser() user: SupabaseUser,
    @Args('input', { nullable: true }) input?: WalletTransactionsInput,
  ): Promise<WalletTransactionsConnection> {
    return this.walletService.getMyWalletTransactions(user.id, input);
  }

  @Query(() => [Transaction])
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.INDIVIDUAL, UserType.BUSINESS)
  async walletTransactions(
    @CurrentUser() user: SupabaseUser,
    @Args('walletAccountId') walletAccountId: string,
  ): Promise<Transaction[]> {
    return this.walletService.getWalletTransactions(user.id, walletAccountId);
  }

  @Mutation(() => WalletFundingResult)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.INDIVIDUAL, UserType.BUSINESS)
  async createWalletFunding(
    @CurrentUser() user: SupabaseUser,
    @Args('input') input: CreateWalletFundingInput,
  ): Promise<WalletFundingResult> {
    return this.walletService.createWalletFunding(user.id, input);
  }

  @Mutation(() => WalletFundingResult)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.INDIVIDUAL, UserType.BUSINESS)
  async confirmWalletFunding(
    @CurrentUser() user: SupabaseUser,
    @Args('input') input: ConfirmWalletFundingInput,
  ): Promise<WalletFundingResult> {
    return this.walletService.confirmWalletFunding(user.id, input);
  }

  @Mutation(() => WalletWithdrawal)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.INDIVIDUAL, UserType.BUSINESS)
  async createWalletWithdrawal(
    @CurrentUser() user: SupabaseUser,
    @Args('input') input: CreateWalletWithdrawalInput,
  ): Promise<WalletWithdrawal> {
    return this.walletService.createWalletWithdrawal(user.id, input);
  }
}
