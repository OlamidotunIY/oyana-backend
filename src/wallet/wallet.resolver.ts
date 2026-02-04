import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
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

@Resolver(() => WalletAccount)
export class WalletResolver {
  constructor(private readonly walletService: WalletService) {}

  @Query(() => WalletAccount, { nullable: true })
  async myWallet(): Promise<WalletAccount | null> {
    // TODO: Implement
    return null;
  }

  @Query(() => [Transaction])
  async walletTransactions(
    @Args('walletAccountId') walletAccountId: string,
  ): Promise<Transaction[]> {
    // TODO: Implement
    return [];
  }

  @Mutation(() => WalletAccount)
  async createWalletAccount(
    @Args('input') input: CreateWalletAccountDto,
  ): Promise<WalletAccount> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  @Mutation(() => Transaction)
  async createWalletTransaction(
    @Args('input') input: CreateTransactionDto,
  ): Promise<Transaction> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  @Mutation(() => PaymentIntent)
  async initiatePayment(
    @Args('input') input: CreatePaymentIntentDto,
  ): Promise<PaymentIntent> {
    // TODO: Implement
    throw new Error('Not implemented');
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
