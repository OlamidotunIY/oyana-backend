import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { WalletAccount, Transaction } from '../graphql';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getWalletByOwnerId(
    ownerType: string,
    ownerId: string,
  ): Promise<WalletAccount | null> {
    const where =
      ownerType === 'customer'
        ? { ownerProfileId: ownerId }
        : { ownerProviderId: ownerId };

    const wallet = await this.prisma.walletAccount.findFirst({
      where: {
        ownerType,
        ...where,
      },
    });

    if (!wallet) {
      return null;
    }

    return {
      id: wallet.id,
      ownerType: wallet.ownerType as any,
      ownerProfileId: wallet.ownerProfileId || undefined,
      ownerProviderId: wallet.ownerProviderId || undefined,
      currency: wallet.currency,
      balanceMinor: wallet.balanceMinor,
      escrowMinor: wallet.escrowMinor,
      status: wallet.status as any,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }

  async getWalletTransactions(walletAccountId: string): Promise<Transaction[]> {
    const transactions = await this.prisma.walletTransaction.findMany({
      where: {
        walletAccountId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return transactions.map((txn) => ({
      id: txn.id,
      walletAccountId: txn.walletAccountId,
      direction: txn.direction as any,
      transactionType: txn.type as any,
      amountMinor: txn.amountMinor,
      currency: txn.currency,
      status: txn.status as any,
      reference: txn.reference,
      shipmentId: txn.relatedShipmentId || undefined,
      paymentIntentId: txn.relatedPaymentIntentId || undefined,
      metadata: txn.metadata,
      createdAt: txn.createdAt,
      updatedAt: txn.updatedAt,
    }));
  }

  async createWalletForProfile(profileId: string): Promise<WalletAccount> {
    const wallet = await this.prisma.walletAccount.create({
      data: {
        ownerType: 'customer',
        ownerProfileId: profileId,
        currency: 'NGN',
        balanceMinor: BigInt(0),
        escrowMinor: BigInt(0),
        status: 'active',
      },
    });

    return {
      id: wallet.id,
      ownerType: wallet.ownerType as any,
      ownerProfileId: wallet.ownerProfileId || undefined,
      ownerProviderId: wallet.ownerProviderId || undefined,
      currency: wallet.currency,
      balanceMinor: wallet.balanceMinor,
      escrowMinor: wallet.escrowMinor,
      status: wallet.status as any,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }
}
