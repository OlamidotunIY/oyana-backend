import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { WalletAccount, Transaction } from '../graphql';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getWalletByOwnerId(ownerId: string): Promise<WalletAccount | null> {
    const user = await this.prisma.profile.findUnique({
      where: {
        id: ownerId,
      },
    });

    const wallet = await this.prisma.walletAccount.findFirst({
      where: {
        ownerProfileId: ownerId,
      },
    });

    if (!wallet) {
      return await this.prisma.$transaction(async (prisma) => {
        const newWallet = await prisma.walletAccount.create({
          data: {
            ownerProfileId: ownerId,
            currency: 'NGN', // Default currency, can be changed later
          },
        });

        return {
          id: newWallet.id,
          ownerProfileId: newWallet.ownerProfileId || undefined,
          currency: newWallet.currency,
          balanceMinor: newWallet.balanceMinor,
          escrowMinor: newWallet.escrowMinor,
          status: newWallet.status as any,
          createdAt: newWallet.createdAt,
          updatedAt: newWallet.updatedAt,
        };
      });
    }

    return {
      id: wallet.id,
      ownerProfileId: wallet.ownerProfileId || undefined,
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
}
