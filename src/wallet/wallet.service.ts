import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type {
  PaymentIntent as PrismaPaymentIntent,
  Prisma,
  WalletAccount as PrismaWalletAccount,
  WalletCardMethod as PrismaWalletCardMethod,
  WalletSavedBankAccount as PrismaWalletSavedBankAccount,
  WalletTransaction as PrismaWalletTransaction,
  WalletWithdrawal as PrismaWalletWithdrawal,
} from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import {
  ConfirmWalletFundingInput,
  CreateWalletFundingInput,
  CreateWalletWithdrawalInput,
  PaymentIntent,
  PaymentIntentStatus,
  Transaction,
  TransactionDirection,
  TransactionStatus,
  TransactionType,
  WalletAccount,
  WalletBank,
  WalletCardMethod,
  WalletCompliance,
  WalletFundingResult,
  WalletSavedBankAccount,
  WalletTransactionsConnection,
  WalletTransactionsInput,
  WalletWithdrawal,
  UserType,
} from '../graphql';
import {
  PaystackBank,
  PaystackService,
  PaystackVerifyTransactionData,
} from './paystack.service';
import { hasAnyProfileRole } from '../auth/utils/roles.util';
import { UserService } from '../user/user.service';

const IDEMPOTENCY_OPERATION_CREATE_FUNDING = 'wallet_funding_create';
const IDEMPOTENCY_OPERATION_CREATE_WITHDRAWAL = 'wallet_withdrawal_create';
const MAX_TRANSACTIONS_PAGE_SIZE = 50;
const DEFAULT_TRANSACTIONS_PAGE_SIZE = 20;
const WALLET_CURRENCY = 'NGN';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paystackService: PaystackService,
    private readonly userService: UserService,
  ) {}

  async getWalletByOwnerId(ownerId: string): Promise<WalletAccount | null> {
    const wallet = await this.getOrCreateWalletAccount(ownerId);

    return this.toGraphqlWalletAccount(wallet);
  }

  async getWalletTransactions(
    ownerProfileId: string,
    walletAccountId: string,
  ): Promise<Transaction[]> {
    await this.assertWalletOwnership(ownerProfileId, walletAccountId);

    const transactions = await this.prisma.walletTransaction.findMany({
      where: {
        walletAccountId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return transactions.map((transaction) =>
      this.toGraphqlTransaction(transaction),
    );
  }

  async getMyWalletTransactions(
    ownerProfileId: string,
    input?: WalletTransactionsInput,
  ): Promise<WalletTransactionsConnection> {
    const wallet = await this.getOrCreateWalletAccount(ownerProfileId);
    const take = Math.min(
      Math.max(input?.take ?? DEFAULT_TRANSACTIONS_PAGE_SIZE, 1),
      MAX_TRANSACTIONS_PAGE_SIZE,
    );

    const transactions = await this.prisma.walletTransaction.findMany({
      where: {
        walletAccountId: wallet.id,
        direction: input?.direction,
        status: input?.status,
        type: input?.transactionType,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      skip: input?.cursor ? 1 : 0,
      cursor: input?.cursor ? { id: input.cursor } : undefined,
    });

    const hasMore = transactions.length > take;
    const pageItems = hasMore ? transactions.slice(0, take) : transactions;

    return {
      items: pageItems.map((transaction) =>
        this.toGraphqlTransaction(transaction),
      ),
      nextCursor: hasMore ? pageItems[pageItems.length - 1]?.id : undefined,
      hasMore,
    };
  }

  async getWalletCompliance(ownerProfileId: string): Promise<WalletCompliance> {
    const profile = await this.prisma.profile.findUnique({
      where: { id: ownerProfileId },
      select: {
        phoneVerified: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const blockReasons: string[] = [];

    if (!profile.phoneVerified) {
      blockReasons.push(
        'Phone verification is required before wallet funding or withdrawal',
      );
    }

    return {
      phoneVerified: profile.phoneVerified,
      canFund: blockReasons.length === 0,
      canWithdraw: blockReasons.length === 0,
      blockReasons,
    };
  }

  async getSavedFundingCards(
    ownerProfileId: string,
  ): Promise<WalletCardMethod[]> {
    const wallet = await this.getOrCreateWalletAccount(ownerProfileId);

    const cards = await this.prisma.walletCardMethod.findMany({
      where: {
        profileId: ownerProfileId,
        walletAccountId: wallet.id,
      },
      orderBy: [{ lastUsedAt: 'desc' }, { createdAt: 'desc' }],
    });

    return cards.map((card) => this.toGraphqlWalletCardMethod(card));
  }

  async getSavedWithdrawalAccounts(
    ownerProfileId: string,
  ): Promise<WalletSavedBankAccount[]> {
    const wallet = await this.getOrCreateWalletAccount(ownerProfileId);

    const bankAccounts = await this.prisma.walletSavedBankAccount.findMany({
      where: {
        profileId: ownerProfileId,
        walletAccountId: wallet.id,
      },
      orderBy: [{ lastUsedAt: 'desc' }, { createdAt: 'desc' }],
    });

    return bankAccounts.map((bankAccount) =>
      this.toGraphqlWalletSavedBankAccount(bankAccount),
    );
  }

  async paystackSupportedBanks(countryCode?: string): Promise<WalletBank[]> {
    const banks = await this.paystackService.getSupportedBanks(
      (countryCode ?? 'NG').toUpperCase(),
    );

    return banks.map((bank) => this.toGraphqlWalletBank(bank));
  }

  async createWalletFunding(
    ownerProfileId: string,
    input: CreateWalletFundingInput,
  ): Promise<WalletFundingResult> {
    await this.assertPhoneVerified(ownerProfileId);

    const amountMinor = this.normalizeAmount(input.amountMinor);
    const currency = this.normalizeCurrency(input.currency);

    if (amountMinor <= BigInt(0)) {
      throw new BadRequestException('Funding amount must be greater than zero');
    }

    const payload = {
      amountMinor: amountMinor.toString(),
      currency,
      savedCardMethodId: input.savedCardMethodId ?? null,
      callbackUrl: input.callbackUrl ?? null,
      metadata: input.metadata ?? null,
    };

    return this.withIdempotency(
      ownerProfileId,
      IDEMPOTENCY_OPERATION_CREATE_FUNDING,
      input.idempotencyKey,
      payload,
      (responsePayload) =>
        this.replayWalletFundingResponse(ownerProfileId, responsePayload),
      async () => {
        const wallet = await this.getOrCreateWalletAccount(ownerProfileId);
        const profile = await this.requireProfile(ownerProfileId);
        const reference = this.generateReference('WLF');

        if (input.savedCardMethodId) {
          const savedCard = await this.prisma.walletCardMethod.findFirst({
            where: {
              id: input.savedCardMethodId,
              profileId: ownerProfileId,
              walletAccountId: wallet.id,
            },
          });

          if (!savedCard) {
            throw new NotFoundException('Saved funding card not found');
          }

          const chargeResult = await this.paystackService.chargeAuthorization({
            email: this.resolvePaystackCustomerEmail(profile),
            amountMinor,
            reference,
            authorizationCode: savedCard.authorizationCode,
            currency,
            metadata: {
              ...(input.metadata ?? {}),
              walletAccountId: wallet.id,
            },
          });

          const paystackStatus = this.mapPaystackStatusToPaymentIntentStatus(
            chargeResult.status,
          );

          const paymentIntent = await this.prisma.paymentIntent.create({
            data: {
              walletAccountId: wallet.id,
              provider: 'paystack',
              amountMinor,
              currency,
              status: paystackStatus,
              paystackReference: reference,
              rawInitResponse: chargeResult as unknown as Prisma.InputJsonValue,
            },
          });

          let result: WalletFundingResult;

          if (paystackStatus === PaymentIntentStatus.SUCCEEDED) {
            result = await this.finalizeFundingIntent(
              paymentIntent.id,
              chargeResult,
              'charge_authorization',
            );
          } else {
            result = {
              success: paystackStatus !== PaymentIntentStatus.FAILED,
              status: paystackStatus,
              reference,
              paymentIntent: this.toGraphqlPaymentIntent(paymentIntent),
              message:
                paystackStatus === PaymentIntentStatus.FAILED
                  ? 'Card charge failed'
                  : 'Card charge is processing',
            };
          }

          return {
            result,
            responsePayload: {
              reference,
            },
          };
        }

        const initializeResult =
          await this.paystackService.initializeTransaction({
            email: this.resolvePaystackCustomerEmail(profile),
            amountMinor,
            reference,
            currency,
            callbackUrl:
              input.callbackUrl ??
              this.getOptionalStringEnv('PAYSTACK_WALLET_CALLBACK_URL'),
            metadata: {
              ...(input.metadata ?? {}),
              walletAccountId: wallet.id,
            },
          });

        const paymentIntent = await this.prisma.paymentIntent.create({
          data: {
            walletAccountId: wallet.id,
            provider: 'paystack',
            amountMinor,
            currency,
            status: PaymentIntentStatus.INITIALIZED,
            paystackReference: reference,
            authorizationUrl: initializeResult.authorization_url,
            rawInitResponse:
              initializeResult as unknown as Prisma.InputJsonValue,
          },
        });

        return {
          result: {
            success: true,
            status: PaymentIntentStatus.INITIALIZED,
            reference,
            authorizationUrl: initializeResult.authorization_url,
            paymentIntent: this.toGraphqlPaymentIntent(paymentIntent),
            message:
              'Funding initialized. Complete checkout to finish wallet funding.',
          },
          responsePayload: {
            reference,
          },
        };
      },
    );
  }

  async confirmWalletFunding(
    ownerProfileId: string,
    input: ConfirmWalletFundingInput,
  ): Promise<WalletFundingResult> {
    await this.assertPhoneVerified(ownerProfileId);

    const paymentIntent = await this.prisma.paymentIntent.findFirst({
      where: {
        paystackReference: input.reference,
        walletAccount: {
          ownerProfileId,
        },
      },
    });

    if (!paymentIntent) {
      throw new NotFoundException('Funding reference not found');
    }

    if (
      paymentIntent.status === PaymentIntentStatus.SUCCEEDED &&
      paymentIntent.confirmedAt
    ) {
      const walletTransaction = await this.prisma.walletTransaction.findFirst({
        where: {
          relatedPaymentIntentId: paymentIntent.id,
          direction: TransactionDirection.CREDIT,
          type: TransactionType.TOPUP,
          status: TransactionStatus.COMPLETED,
        },
      });

      return {
        success: true,
        status: PaymentIntentStatus.SUCCEEDED,
        reference: input.reference,
        paymentIntent: this.toGraphqlPaymentIntent(paymentIntent),
        walletTransaction: walletTransaction
          ? this.toGraphqlTransaction(walletTransaction)
          : undefined,
      };
    }

    const verificationResult = await this.paystackService.verifyTransaction(
      input.reference,
    );

    const verifyStatus = this.mapPaystackStatusToPaymentIntentStatus(
      verificationResult.status,
    );

    if (verifyStatus !== PaymentIntentStatus.SUCCEEDED) {
      const failedIntent = await this.prisma.paymentIntent.update({
        where: {
          id: paymentIntent.id,
        },
        data: {
          status: PaymentIntentStatus.FAILED,
          rawWebhook: verificationResult as unknown as Prisma.InputJsonValue,
        },
      });

      return {
        success: false,
        status: PaymentIntentStatus.FAILED,
        reference: input.reference,
        paymentIntent: this.toGraphqlPaymentIntent(failedIntent),
        message: 'Payment is not yet successful',
      };
    }

    return this.finalizeFundingIntent(
      paymentIntent.id,
      verificationResult,
      'confirm',
    );
  }

  async createWalletWithdrawal(
    ownerProfileId: string,
    input: CreateWalletWithdrawalInput,
  ): Promise<WalletWithdrawal> {
    await this.assertPhoneVerified(ownerProfileId);

    const amountMinor = this.normalizeAmount(input.amountMinor);
    const currency = this.normalizeCurrency(input.currency);

    if (amountMinor <= BigInt(0)) {
      throw new BadRequestException(
        'Withdrawal amount must be greater than zero',
      );
    }

    if (
      !input.savedBankAccountId &&
      (!input.bankCode || !input.accountNumber)
    ) {
      throw new BadRequestException(
        'Provide a saved bank account or both bankCode and accountNumber',
      );
    }

    const payload = {
      amountMinor: amountMinor.toString(),
      currency,
      savedBankAccountId: input.savedBankAccountId ?? null,
      bankCode: input.bankCode ?? null,
      accountNumber: input.accountNumber ?? null,
      saveAccount: Boolean(input.saveAccount),
      reason: input.reason ?? null,
    };

    return this.withIdempotency(
      ownerProfileId,
      IDEMPOTENCY_OPERATION_CREATE_WITHDRAWAL,
      input.idempotencyKey,
      payload,
      async (responsePayload) => {
        const withdrawalId = this.readStringFromIdempotencyPayload(
          responsePayload,
          'withdrawalId',
        );

        if (!withdrawalId) {
          throw new ConflictException(
            'Withdrawal idempotency response is invalid',
          );
        }

        const withdrawal = await this.prisma.walletWithdrawal.findFirst({
          where: {
            id: withdrawalId,
            profileId: ownerProfileId,
          },
        });

        if (!withdrawal) {
          throw new ConflictException(
            'Unable to replay withdrawal request. Please use a new idempotency key.',
          );
        }

        return this.toGraphqlWalletWithdrawal(withdrawal);
      },
      async () => {
        const wallet = await this.getOrCreateWalletAccount(ownerProfileId);

        const destination = input.savedBankAccountId
          ? await this.getSavedBankWithdrawalDestination(
              ownerProfileId,
              wallet.id,
              input.savedBankAccountId,
            )
          : await this.getRawBankWithdrawalDestination(
              input.bankCode!,
              input.accountNumber!,
              currency,
            );

        let createdWithdrawal: PrismaWalletWithdrawal;

        await this.prisma.$transaction(async (tx) => {
          const walletForUpdate = await tx.walletAccount.findUnique({
            where: {
              id: wallet.id,
            },
          });

          if (!walletForUpdate) {
            throw new NotFoundException('Wallet not found');
          }

          if (walletForUpdate.balanceMinor < amountMinor) {
            throw new BadRequestException('Insufficient wallet balance');
          }

          const withdrawalReference = this.generateReference('WDR');

          createdWithdrawal = await tx.walletWithdrawal.create({
            data: {
              walletAccountId: wallet.id,
              profileId: ownerProfileId,
              reference: withdrawalReference,
              amountMinor,
              currency,
              status: 'processing',
              bankCode: destination.bankCode,
              bankName: destination.bankName,
              accountName: destination.accountName,
              accountNumberMasked: destination.accountNumberMasked,
              recipientCode: destination.recipientCode,
              savedBankAccountId: destination.savedBankAccountId,
            },
          });

          await tx.walletTransaction.create({
            data: {
              walletAccountId: wallet.id,
              direction: TransactionDirection.DEBIT,
              type: TransactionType.WITHDRAWAL,
              status: TransactionStatus.COMPLETED,
              amountMinor,
              currency,
              reference: this.getWithdrawalDebitReference(createdWithdrawal.id),
              metadata: {
                reason: input.reason ?? null,
                recipientCode: destination.recipientCode,
                withdrawalId: createdWithdrawal.id,
              } as Prisma.InputJsonValue,
            },
          });

          await tx.walletAccount.update({
            where: {
              id: wallet.id,
            },
            data: {
              balanceMinor: {
                decrement: amountMinor,
              },
            },
          });

          if (destination.savedBankAccountId) {
            await tx.walletSavedBankAccount.update({
              where: {
                id: destination.savedBankAccountId,
              },
              data: {
                lastUsedAt: new Date(),
              },
            });
          }
        });

        const withdrawal = createdWithdrawal!;

        try {
          const transferResult = await this.paystackService.initiateTransfer({
            amountMinor,
            reference: withdrawal.reference,
            recipientCode: destination.recipientCode,
            reason: input.reason,
            currency,
          });

          const normalizedTransferStatus =
            transferResult.status?.toLowerCase() ?? 'processing';

          if (
            normalizedTransferStatus === 'failed' ||
            normalizedTransferStatus === 'reversed'
          ) {
            await this.markWithdrawalFailedAndReverse(
              withdrawal.id,
              'Withdrawal transfer failed',
              transferResult,
            );
            throw new BadRequestException('Withdrawal transfer failed');
          }

          let savedBankAccountId = destination.savedBankAccountId;

          if (
            !savedBankAccountId &&
            input.saveAccount &&
            destination.persistable
          ) {
            const savedAccount = await this.persistSavedBankAccount({
              profileId: ownerProfileId,
              walletAccountId: wallet.id,
              bankCode: destination.bankCode,
              bankName: destination.bankName,
              accountName: destination.accountName,
              accountNumberMasked: destination.accountNumberMasked,
              recipientCode: destination.recipientCode,
            });
            savedBankAccountId = savedAccount.id;
          }

          const updatedWithdrawal = await this.prisma.walletWithdrawal.update({
            where: {
              id: withdrawal.id,
            },
            data: {
              status:
                normalizedTransferStatus === 'success'
                  ? 'succeeded'
                  : 'processing',
              completedAt:
                normalizedTransferStatus === 'success' ? new Date() : undefined,
              transferCode: transferResult.transfer_code,
              paystackTransferId: transferResult.id
                ? String(transferResult.id)
                : undefined,
              rawInitResponse:
                transferResult as unknown as Prisma.InputJsonValue,
              savedBankAccountId,
            },
          });

          return {
            result: this.toGraphqlWalletWithdrawal(updatedWithdrawal),
            responsePayload: {
              withdrawalId: updatedWithdrawal.id,
            },
          };
        } catch (error) {
          await this.markWithdrawalFailedAndReverse(
            withdrawal.id,
            error instanceof Error
              ? error.message
              : 'Withdrawal transfer failed',
          );
          throw error;
        }
      },
    );
  }

  async handlePaystackWebhookEvent(
    payload: Record<string, unknown>,
    rawBody: string,
    signature: string,
  ): Promise<void> {
    const signatureValid = this.paystackService.verifyWebhookSignature(
      rawBody,
      signature,
    );

    if (!signatureValid) {
      throw new ForbiddenException('Invalid Paystack webhook signature');
    }

    const event =
      typeof payload.event === 'string' ? payload.event.toLowerCase() : null;
    const eventData =
      payload.data && typeof payload.data === 'object'
        ? (payload.data as Record<string, unknown>)
        : undefined;

    if (!event || !eventData) {
      this.logger.warn('Ignoring malformed Paystack webhook payload');
      return;
    }

    if (event === 'charge.success') {
      const reference = this.readString(eventData.reference);
      if (!reference) {
        this.logger.warn('Ignoring charge.success webhook without reference');
        return;
      }

      await this.finalizeFundingByReference(reference, eventData, 'webhook');
      return;
    }

    if (event === 'transfer.success') {
      const reference = this.readString(eventData.reference);
      if (!reference) {
        this.logger.warn('Ignoring transfer.success webhook without reference');
        return;
      }

      await this.markWithdrawalSucceeded(reference, eventData);
      return;
    }

    if (event === 'transfer.failed' || event === 'transfer.reversed') {
      const reference = this.readString(eventData.reference);
      if (!reference) {
        this.logger.warn(`${event} webhook missing reference`);
        return;
      }

      const failureReason =
        this.readString(eventData.complete_message) ??
        this.readString(eventData.failure_reason) ??
        `${event} webhook received`;

      await this.markWithdrawalFailedByReference(
        reference,
        failureReason,
        eventData,
      );
      return;
    }

    this.logger.debug(`Ignoring unsupported Paystack webhook event: ${event}`);
  }

  private async finalizeFundingByReference(
    reference: string,
    rawPayload: Record<string, unknown>,
    source: 'webhook' | 'confirm',
  ): Promise<void> {
    const paymentIntent = await this.prisma.paymentIntent.findFirst({
      where: {
        paystackReference: reference,
      },
      select: {
        id: true,
      },
    });

    if (!paymentIntent) {
      this.logger.warn(
        `Received funding webhook for unknown reference ${reference}`,
      );
      return;
    }

    await this.finalizeFundingIntent(
      paymentIntent.id,
      rawPayload as unknown as PaystackVerifyTransactionData,
      source,
    );
  }

  private async finalizeFundingIntent(
    paymentIntentId: string,
    verificationData: PaystackVerifyTransactionData,
    source: 'webhook' | 'confirm' | 'charge_authorization',
  ): Promise<WalletFundingResult> {
    const { paymentIntent, walletTransaction } = await this.prisma.$transaction(
      async (tx) => {
        const intent = await tx.paymentIntent.findUnique({
          where: {
            id: paymentIntentId,
          },
          include: {
            walletAccount: {
              select: {
                ownerProfileId: true,
              },
            },
          },
        });

        if (!intent) {
          throw new NotFoundException('Payment intent not found');
        }

        const verifyStatus = this.mapPaystackStatusToPaymentIntentStatus(
          verificationData.status,
        );
        if (verifyStatus !== PaymentIntentStatus.SUCCEEDED) {
          const failedIntent = await tx.paymentIntent.update({
            where: {
              id: intent.id,
            },
            data: {
              status: PaymentIntentStatus.FAILED,
              rawWebhook: verificationData as unknown as Prisma.InputJsonValue,
            },
          });

          return {
            paymentIntent: failedIntent,
            walletTransaction: null,
          };
        }

        const verifiedAmount = this.extractPaystackAmount(
          verificationData.amount,
        );
        if (verifiedAmount !== null && verifiedAmount !== intent.amountMinor) {
          throw new BadRequestException(
            'Funding verification amount does not match initialized amount',
          );
        }

        const verifiedCurrency =
          this.readString(verificationData.currency)?.toUpperCase() ??
          intent.currency;
        if (verifiedCurrency !== intent.currency) {
          throw new BadRequestException(
            'Funding verification currency does not match initialized currency',
          );
        }

        const existingWalletTransaction = await tx.walletTransaction.findFirst({
          where: {
            relatedPaymentIntentId: intent.id,
            direction: TransactionDirection.CREDIT,
            type: TransactionType.TOPUP,
            status: TransactionStatus.COMPLETED,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        let walletTransaction = existingWalletTransaction;

        if (!existingWalletTransaction) {
          const fundingTransactionReference =
            this.getFundingTransactionReference(intent.id);

          try {
            walletTransaction = await tx.walletTransaction.create({
              data: {
                walletAccountId: intent.walletAccountId,
                direction: TransactionDirection.CREDIT,
                type: TransactionType.TOPUP,
                status: TransactionStatus.COMPLETED,
                amountMinor: intent.amountMinor,
                currency: intent.currency,
                reference: fundingTransactionReference,
                relatedPaymentIntentId: intent.id,
                metadata: {
                  source,
                  paystackReference: intent.paystackReference,
                } as Prisma.InputJsonValue,
              },
            });

            await tx.walletAccount.update({
              where: {
                id: intent.walletAccountId,
              },
              data: {
                balanceMinor: {
                  increment: intent.amountMinor,
                },
              },
            });
          } catch (error) {
            if (!this.isUniqueConstraintError(error)) {
              throw error;
            }

            walletTransaction = await tx.walletTransaction.findUnique({
              where: {
                reference: fundingTransactionReference,
              },
            });
          }
        }

        const updatedIntent = await tx.paymentIntent.update({
          where: {
            id: intent.id,
          },
          data: {
            status: PaymentIntentStatus.SUCCEEDED,
            confirmedAt: new Date(),
            rawWebhook: verificationData as unknown as Prisma.InputJsonValue,
          },
        });

        const profileId = intent.walletAccount.ownerProfileId;
        if (profileId) {
          await this.upsertWalletCardMethod(
            tx,
            profileId,
            intent.walletAccountId,
            verificationData,
            {
              paystackReference: intent.paystackReference,
              source,
            },
          );
        }

        return {
          paymentIntent: updatedIntent,
          walletTransaction,
        };
      },
    );

    return {
      success: paymentIntent.status === PaymentIntentStatus.SUCCEEDED,
      status: paymentIntent.status as PaymentIntentStatus,
      reference: paymentIntent.paystackReference ?? randomUUID(),
      paymentIntent: this.toGraphqlPaymentIntent(paymentIntent),
      walletTransaction: walletTransaction
        ? this.toGraphqlTransaction(walletTransaction)
        : undefined,
      message:
        paymentIntent.status === PaymentIntentStatus.SUCCEEDED
          ? 'Wallet funded successfully'
          : 'Funding verification failed',
    };
  }

  private async upsertWalletCardMethod(
    tx: Prisma.TransactionClient,
    profileId: string,
    walletAccountId: string,
    verificationData: PaystackVerifyTransactionData,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const authorization = verificationData.authorization;

    if (
      !authorization?.authorization_code ||
      authorization.reusable === false
    ) {
      return;
    }

    const existingCard = await tx.walletCardMethod.findUnique({
      where: {
        authorizationCode: authorization.authorization_code,
      },
    });

    const now = new Date();
    const baseData = {
      profileId,
      walletAccountId,
      provider: 'paystack',
      signature: authorization.signature,
      cardType: authorization.card_type,
      bank: authorization.bank,
      countryCode: authorization.country_code,
      brand: authorization.brand,
      first6: authorization.bin,
      last4: authorization.last4,
      expMonth: authorization.exp_month,
      expYear: authorization.exp_year,
      reusable: authorization.reusable ?? true,
      customerCode: verificationData.customer?.customer_code,
      channel: authorization.channel,
      metadata: {
        ...(metadata ?? {}),
      } as Prisma.InputJsonValue,
      lastUsedAt: now,
    };

    if (existingCard) {
      await tx.walletCardMethod.update({
        where: {
          id: existingCard.id,
        },
        data: baseData,
      });
      return;
    }

    await tx.walletCardMethod.create({
      data: {
        ...baseData,
        authorizationCode: authorization.authorization_code,
      },
    });
  }

  private async replayWalletFundingResponse(
    ownerProfileId: string,
    responsePayload: Prisma.JsonValue,
  ): Promise<WalletFundingResult> {
    const reference = this.readStringFromIdempotencyPayload(
      responsePayload,
      'reference',
    );

    if (!reference) {
      throw new ConflictException('Funding idempotency response is invalid');
    }

    const paymentIntent = await this.prisma.paymentIntent.findFirst({
      where: {
        paystackReference: reference,
        walletAccount: {
          ownerProfileId,
        },
      },
    });

    if (!paymentIntent) {
      throw new ConflictException(
        'Unable to replay funding response. Please use a new idempotency key.',
      );
    }

    const walletTransaction = await this.prisma.walletTransaction.findFirst({
      where: {
        relatedPaymentIntentId: paymentIntent.id,
      },
    });

    return {
      success:
        paymentIntent.status === PaymentIntentStatus.SUCCEEDED ||
        paymentIntent.status === PaymentIntentStatus.INITIALIZED ||
        paymentIntent.status === PaymentIntentStatus.PENDING,
      status: paymentIntent.status as PaymentIntentStatus,
      reference,
      authorizationUrl: paymentIntent.authorizationUrl ?? undefined,
      paymentIntent: this.toGraphqlPaymentIntent(paymentIntent),
      walletTransaction: walletTransaction
        ? this.toGraphqlTransaction(walletTransaction)
        : undefined,
    };
  }

  private async markWithdrawalSucceeded(
    reference: string,
    rawPayload: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.walletWithdrawal.updateMany({
      where: {
        reference,
        status: {
          in: ['processing', 'pending'],
        },
      },
      data: {
        status: 'succeeded',
        completedAt: new Date(),
        transferCode: this.readString(rawPayload.transfer_code) ?? undefined,
        paystackTransferId: this.readString(rawPayload.id) ?? undefined,
        rawWebhook: rawPayload as unknown as Prisma.InputJsonValue,
      },
    });
  }

  private async markWithdrawalFailedByReference(
    reference: string,
    failureReason: string,
    rawPayload?: Record<string, unknown>,
  ): Promise<void> {
    const withdrawal = await this.prisma.walletWithdrawal.findUnique({
      where: {
        reference,
      },
      select: {
        id: true,
      },
    });

    if (!withdrawal) {
      this.logger.warn(
        `Received transfer failure webhook for unknown withdrawal reference ${reference}`,
      );
      return;
    }

    await this.markWithdrawalFailedAndReverse(
      withdrawal.id,
      failureReason,
      rawPayload,
    );
  }

  private async markWithdrawalFailedAndReverse(
    withdrawalId: string,
    failureReason: string,
    rawPayload?: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const withdrawal = await tx.walletWithdrawal.findUnique({
        where: {
          id: withdrawalId,
        },
      });

      if (!withdrawal) {
        return;
      }

      if (withdrawal.status === 'reversed') {
        return;
      }

      const reversalReference = this.getWithdrawalReversalReference(
        withdrawal.id,
      );

      const existingReversal = await tx.walletTransaction.findUnique({
        where: {
          reference: reversalReference,
        },
      });

      if (!existingReversal) {
        await tx.walletTransaction.create({
          data: {
            walletAccountId: withdrawal.walletAccountId,
            direction: TransactionDirection.CREDIT,
            type: TransactionType.ADJUSTMENT,
            status: TransactionStatus.COMPLETED,
            amountMinor: withdrawal.amountMinor,
            currency: withdrawal.currency,
            reference: reversalReference,
            metadata: {
              reason: 'withdrawal_reversal',
              failureReason,
              withdrawalId: withdrawal.id,
            } as Prisma.InputJsonValue,
          },
        });

        await tx.walletAccount.update({
          where: {
            id: withdrawal.walletAccountId,
          },
          data: {
            balanceMinor: {
              increment: withdrawal.amountMinor,
            },
          },
        });
      }

      await tx.walletWithdrawal.update({
        where: {
          id: withdrawal.id,
        },
        data: {
          status: 'reversed',
          failureReason,
          failedAt: new Date(),
          ...(rawPayload
            ? { rawWebhook: rawPayload as unknown as Prisma.InputJsonValue }
            : {}),
        },
      });
    });
  }

  private async getSavedBankWithdrawalDestination(
    ownerProfileId: string,
    walletAccountId: string,
    savedBankAccountId: string,
  ): Promise<{
    bankCode: string;
    bankName: string;
    accountName: string;
    accountNumberMasked: string;
    recipientCode: string;
    savedBankAccountId: string;
    persistable: false;
  }> {
    const savedAccount = await this.prisma.walletSavedBankAccount.findFirst({
      where: {
        id: savedBankAccountId,
        profileId: ownerProfileId,
        walletAccountId,
      },
    });

    if (!savedAccount) {
      throw new NotFoundException('Saved withdrawal account not found');
    }

    return {
      bankCode: savedAccount.bankCode,
      bankName: savedAccount.bankName,
      accountName: savedAccount.accountName,
      accountNumberMasked: savedAccount.accountNumberMasked,
      recipientCode: savedAccount.recipientCode,
      savedBankAccountId: savedAccount.id,
      persistable: false,
    };
  }

  private async getRawBankWithdrawalDestination(
    bankCode: string,
    accountNumber: string,
    currency: string,
  ): Promise<{
    bankCode: string;
    bankName: string;
    accountName: string;
    accountNumberMasked: string;
    recipientCode: string;
    savedBankAccountId: null;
    persistable: true;
  }> {
    const resolveAccountResult = await this.paystackService.resolveBankAccount({
      bankCode,
      accountNumber,
    });

    const recipient = await this.paystackService.createTransferRecipient({
      accountName: resolveAccountResult.account_name,
      accountNumber,
      bankCode,
      currency,
    });

    const bankName = await this.lookupBankName(bankCode);

    return {
      bankCode,
      bankName,
      accountName: resolveAccountResult.account_name,
      accountNumberMasked: this.maskAccountNumber(accountNumber),
      recipientCode: recipient.recipient_code,
      savedBankAccountId: null,
      persistable: true,
    };
  }

  private async persistSavedBankAccount(input: {
    profileId: string;
    walletAccountId: string;
    bankCode: string;
    bankName: string;
    accountName: string;
    accountNumberMasked: string;
    recipientCode: string;
  }): Promise<PrismaWalletSavedBankAccount> {
    const existing = await this.prisma.walletSavedBankAccount.findFirst({
      where: {
        profileId: input.profileId,
        walletAccountId: input.walletAccountId,
        recipientCode: input.recipientCode,
      },
    });

    if (existing) {
      return this.prisma.walletSavedBankAccount.update({
        where: {
          id: existing.id,
        },
        data: {
          bankCode: input.bankCode,
          bankName: input.bankName,
          accountName: input.accountName,
          accountNumberMasked: input.accountNumberMasked,
          lastUsedAt: new Date(),
        },
      });
    }

    return this.prisma.walletSavedBankAccount.create({
      data: {
        profileId: input.profileId,
        walletAccountId: input.walletAccountId,
        bankCode: input.bankCode,
        bankName: input.bankName,
        accountName: input.accountName,
        accountNumberMasked: input.accountNumberMasked,
        recipientCode: input.recipientCode,
        lastUsedAt: new Date(),
      },
    });
  }

  private async lookupBankName(bankCode: string): Promise<string> {
    try {
      const banks = await this.paystackService.getSupportedBanks('NG');
      const matchingBank = banks.find((bank) => bank.code === bankCode);
      return matchingBank?.name ?? bankCode;
    } catch (error) {
      this.logger.warn(
        `Unable to resolve bank name for code ${bankCode}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return bankCode;
    }
  }

  private async withIdempotency<T>(
    ownerProfileId: string,
    operation: string,
    idempotencyKey: string,
    payload: Record<string, unknown>,
    replay: (responsePayload: Prisma.JsonValue) => Promise<T>,
    action: () => Promise<{ result: T; responsePayload: Prisma.JsonValue }>,
  ): Promise<T> {
    const key = idempotencyKey.trim();

    if (!key) {
      throw new BadRequestException('idempotencyKey is required');
    }

    const requestHash = this.hashPayload(payload);

    const existingRecord = await this.prisma.walletIdempotencyKey.findUnique({
      where: {
        profileId_operation_key: {
          profileId: ownerProfileId,
          operation,
          key,
        },
      },
    });

    if (existingRecord) {
      if (existingRecord.requestHash !== requestHash) {
        throw new ConflictException(
          'Idempotency key has already been used with a different payload',
        );
      }

      if (existingRecord.status === 'completed' && existingRecord.response) {
        return replay(existingRecord.response);
      }

      if (existingRecord.status === 'failed') {
        throw new ConflictException(
          'Previous request with this idempotency key failed. Use a new idempotency key.',
        );
      }

      throw new ConflictException(
        'A request with this idempotency key is already processing',
      );
    }

    let idempotencyRecord: { id: string };

    try {
      idempotencyRecord = await this.prisma.walletIdempotencyKey.create({
        data: {
          profileId: ownerProfileId,
          operation,
          key,
          requestHash,
          status: 'in_progress',
        },
        select: {
          id: true,
        },
      });
    } catch (error) {
      if (!this.isUniqueConstraintError(error)) {
        throw error;
      }

      const racedRecord = await this.prisma.walletIdempotencyKey.findUnique({
        where: {
          profileId_operation_key: {
            profileId: ownerProfileId,
            operation,
            key,
          },
        },
      });

      if (!racedRecord) {
        throw new ConflictException(
          'A request with this idempotency key already exists',
        );
      }

      if (racedRecord.requestHash !== requestHash) {
        throw new ConflictException(
          'Idempotency key has already been used with a different payload',
        );
      }

      if (racedRecord.status === 'completed' && racedRecord.response) {
        return replay(racedRecord.response);
      }

      if (racedRecord.status === 'failed') {
        throw new ConflictException(
          'Previous request with this idempotency key failed. Use a new idempotency key.',
        );
      }

      throw new ConflictException(
        'A request with this idempotency key is already processing',
      );
    }

    try {
      const { result, responsePayload } = await action();

      await this.prisma.walletIdempotencyKey.update({
        where: {
          id: idempotencyRecord.id,
        },
        data: {
          status: 'completed',
          response: this.toJsonValue(
            responsePayload,
          ) as unknown as Prisma.InputJsonValue,
        },
      });

      return result;
    } catch (error) {
      await this.prisma.walletIdempotencyKey.update({
        where: {
          id: idempotencyRecord.id,
        },
        data: {
          status: 'failed',
        },
      });

      throw error;
    }
  }

  private async assertWalletOwnership(
    ownerProfileId: string,
    walletAccountId: string,
  ): Promise<void> {
    const wallet = await this.prisma.walletAccount.findFirst({
      where: {
        id: walletAccountId,
        ownerProfileId,
      },
      select: {
        id: true,
      },
    });

    if (!wallet) {
      throw new ForbiddenException(
        'You do not have access to this wallet account',
      );
    }
  }

  private async getOrCreateWalletAccount(
    ownerId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PrismaWalletAccount> {
    const prismaClient = tx ?? this.prisma;
    await this.requireProfile(ownerId);

    return prismaClient.walletAccount.upsert({
      where: {
        ownerProfileId: ownerId,
      },
      update: {},
      create: {
        ownerProfileId: ownerId,
        currency: WALLET_CURRENCY,
      },
    });
  }

  private async requireProfile(ownerProfileId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: {
        id: ownerProfileId,
      },
      select: {
        id: true,
        email: true,
        role: true,
        accountRole: true,
        activeAppMode: true,
        driverProfile: {
          select: {
            onboardingStatus: true,
          },
        },
        phoneVerified: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    if (hasAnyProfileRole(profile, [UserType.BUSINESS])) {
      await this.userService.assertDriverOnboardingComplete(ownerProfileId);
    }

    return profile;
  }

  private resolvePaystackCustomerEmail(profile: {
    id: string;
    email: string | null;
  }): string {
    return profile.email ?? `wallet+${profile.id}@oyana.local`;
  }

  private async assertPhoneVerified(ownerProfileId: string): Promise<void> {
    const profile = await this.requireProfile(ownerProfileId);

    if (!profile.phoneVerified) {
      throw new ForbiddenException(
        'Phone verification is required before wallet funding or withdrawal',
      );
    }
  }

  private mapPaystackStatusToPaymentIntentStatus(
    status?: string,
  ): PaymentIntentStatus {
    const normalizedStatus = status?.toLowerCase();

    if (normalizedStatus === 'success') {
      return PaymentIntentStatus.SUCCEEDED;
    }

    if (
      normalizedStatus === 'failed' ||
      normalizedStatus === 'abandoned' ||
      normalizedStatus === 'error'
    ) {
      return PaymentIntentStatus.FAILED;
    }

    if (normalizedStatus === 'cancelled') {
      return PaymentIntentStatus.CANCELLED;
    }

    return PaymentIntentStatus.PENDING;
  }

  private normalizeCurrency(inputCurrency?: string): string {
    const normalizedCurrency = (inputCurrency ?? WALLET_CURRENCY)
      .trim()
      .toUpperCase();

    if (normalizedCurrency !== WALLET_CURRENCY) {
      throw new BadRequestException(
        `Only ${WALLET_CURRENCY} wallet currency is supported for now`,
      );
    }

    return normalizedCurrency;
  }

  private normalizeAmount(amountMinor: bigint): bigint {
    try {
      return BigInt(amountMinor);
    } catch (error) {
      throw new BadRequestException('Invalid amount provided');
    }
  }

  private extractPaystackAmount(amount: unknown): bigint | null {
    if (typeof amount === 'number' && Number.isFinite(amount)) {
      return BigInt(Math.trunc(amount));
    }

    if (typeof amount === 'string' && amount.trim().length > 0) {
      try {
        return BigInt(amount.trim());
      } catch {
        return null;
      }
    }

    return null;
  }

  private generateReference(prefix: 'WLF' | 'WDR'): string {
    return `${prefix}_${Date.now()}_${randomUUID().replace(/-/g, '').slice(0, 10)}`;
  }

  private getFundingTransactionReference(paymentIntentId: string): string {
    return `WLT_TOPUP_${paymentIntentId}`;
  }

  private getWithdrawalDebitReference(withdrawalId: string): string {
    return `WLT_WITHDRAW_${withdrawalId}`;
  }

  private getWithdrawalReversalReference(withdrawalId: string): string {
    return `WLT_WITHDRAW_REV_${withdrawalId}`;
  }

  private maskAccountNumber(accountNumber: string): string {
    const trimmed = accountNumber.trim();

    if (trimmed.length <= 4) {
      return `****${trimmed}`;
    }

    return `******${trimmed.slice(-4)}`;
  }

  private isUniqueConstraintError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const candidate = error as { code?: string };
    return candidate.code === 'P2002';
  }

  private hashPayload(payload: Record<string, unknown>): string {
    const stableString = this.stableStringify(payload);

    return createHash('sha256').update(stableString).digest('hex');
  }

  private stableStringify(value: unknown): string {
    if (value === null || typeof value !== 'object') {
      return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableStringify(item)).join(',')}]`;
    }

    const objectValue = value as Record<string, unknown>;
    const keys = Object.keys(objectValue).sort();
    return `{${keys
      .map(
        (key) =>
          `${JSON.stringify(key)}:${this.stableStringify(objectValue[key])}`,
      )
      .join(',')}}`;
  }

  private toJsonValue(value: unknown): unknown {
    if (typeof value === 'bigint') {
      return value.toString();
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.toJsonValue(item));
    }

    if (value && typeof value === 'object') {
      return Object.entries(value as Record<string, unknown>).reduce<
        Record<string, unknown>
      >((accumulator, [key, item]) => {
        accumulator[key] = this.toJsonValue(item);
        return accumulator;
      }, {});
    }

    return value;
  }

  private readString(value: unknown): string | null {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }

    return null;
  }

  private readStringFromIdempotencyPayload(
    payload: Prisma.JsonValue,
    key: string,
  ): string | null {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return null;
    }

    return this.readString((payload as Record<string, unknown>)[key]);
  }

  private getOptionalStringEnv(envKey: string): string | undefined {
    const value = process.env[envKey]?.trim();

    return value && value.length > 0 ? value : undefined;
  }

  private toGraphqlWalletAccount(wallet: PrismaWalletAccount): WalletAccount {
    return {
      id: wallet.id,
      ownerProfileId: wallet.ownerProfileId ?? undefined,
      currency: wallet.currency,
      balanceMinor: wallet.balanceMinor,
      escrowMinor: wallet.escrowMinor,
      status: wallet.status as any,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }

  private toGraphqlTransaction(
    transaction: PrismaWalletTransaction,
  ): Transaction {
    return {
      id: transaction.id,
      walletAccountId: transaction.walletAccountId,
      direction: transaction.direction as any,
      transactionType: transaction.type as any,
      amountMinor: transaction.amountMinor,
      currency: transaction.currency,
      status: transaction.status as any,
      reference: transaction.reference,
      shipmentId: transaction.relatedShipmentId ?? undefined,
      paymentIntentId: transaction.relatedPaymentIntentId ?? undefined,
      metadata: transaction.metadata as any,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
  }

  private toGraphqlPaymentIntent(
    paymentIntent: PrismaPaymentIntent,
  ): PaymentIntent {
    return {
      id: paymentIntent.id,
      walletAccountId: paymentIntent.walletAccountId,
      provider: paymentIntent.provider,
      amountMinor: paymentIntent.amountMinor,
      currency: paymentIntent.currency,
      status: paymentIntent.status as any,
      paystackReference: paymentIntent.paystackReference ?? undefined,
      authorizationUrl: paymentIntent.authorizationUrl ?? undefined,
      rawInitResponse: paymentIntent.rawInitResponse as any,
      rawWebhook: paymentIntent.rawWebhook as any,
      confirmedAt: paymentIntent.confirmedAt ?? undefined,
      createdAt: paymentIntent.createdAt,
      updatedAt: paymentIntent.updatedAt,
    };
  }

  private toGraphqlWalletCardMethod(
    cardMethod: PrismaWalletCardMethod,
  ): WalletCardMethod {
    return {
      id: cardMethod.id,
      profileId: cardMethod.profileId,
      walletAccountId: cardMethod.walletAccountId,
      provider: cardMethod.provider,
      signature: cardMethod.signature ?? undefined,
      cardType: cardMethod.cardType ?? undefined,
      bank: cardMethod.bank ?? undefined,
      countryCode: cardMethod.countryCode ?? undefined,
      brand: cardMethod.brand ?? undefined,
      first6: cardMethod.first6 ?? undefined,
      last4: cardMethod.last4 ?? undefined,
      expMonth: cardMethod.expMonth ?? undefined,
      expYear: cardMethod.expYear ?? undefined,
      reusable: cardMethod.reusable,
      customerCode: cardMethod.customerCode ?? undefined,
      channel: cardMethod.channel ?? undefined,
      metadata: cardMethod.metadata as Record<string, unknown> | undefined,
      lastUsedAt: cardMethod.lastUsedAt ?? undefined,
      createdAt: cardMethod.createdAt,
      updatedAt: cardMethod.updatedAt,
    };
  }

  private toGraphqlWalletSavedBankAccount(
    bankAccount: PrismaWalletSavedBankAccount,
  ): WalletSavedBankAccount {
    return {
      id: bankAccount.id,
      profileId: bankAccount.profileId,
      walletAccountId: bankAccount.walletAccountId,
      provider: bankAccount.provider,
      bankCode: bankAccount.bankCode,
      bankName: bankAccount.bankName,
      accountNumberMasked: bankAccount.accountNumberMasked,
      accountName: bankAccount.accountName,
      recipientCode: bankAccount.recipientCode,
      metadata: bankAccount.metadata as Record<string, unknown> | undefined,
      lastUsedAt: bankAccount.lastUsedAt ?? undefined,
      createdAt: bankAccount.createdAt,
      updatedAt: bankAccount.updatedAt,
    };
  }

  private toGraphqlWalletWithdrawal(
    withdrawal: PrismaWalletWithdrawal,
  ): WalletWithdrawal {
    return {
      id: withdrawal.id,
      walletAccountId: withdrawal.walletAccountId,
      profileId: withdrawal.profileId,
      reference: withdrawal.reference,
      amountMinor: withdrawal.amountMinor,
      currency: withdrawal.currency,
      status: withdrawal.status,
      bankCode: withdrawal.bankCode ?? undefined,
      bankName: withdrawal.bankName ?? undefined,
      accountNumberMasked: withdrawal.accountNumberMasked ?? undefined,
      accountName: withdrawal.accountName ?? undefined,
      recipientCode: withdrawal.recipientCode ?? undefined,
      transferCode: withdrawal.transferCode ?? undefined,
      paystackTransferId: withdrawal.paystackTransferId ?? undefined,
      failureReason: withdrawal.failureReason ?? undefined,
      rawInitResponse: withdrawal.rawInitResponse as
        | Record<string, unknown>
        | undefined,
      rawWebhook: withdrawal.rawWebhook as Record<string, unknown> | undefined,
      completedAt: withdrawal.completedAt ?? undefined,
      failedAt: withdrawal.failedAt ?? undefined,
      relatedTransactionId: withdrawal.relatedTransactionId ?? undefined,
      savedBankAccountId: withdrawal.savedBankAccountId ?? undefined,
      createdAt: withdrawal.createdAt,
      updatedAt: withdrawal.updatedAt,
    };
  }

  private toGraphqlWalletBank(bank: PaystackBank): WalletBank {
    return {
      name: bank.name,
      code: bank.code,
      slug: bank.slug,
      longcode: bank.longcode,
      gateway: bank.gateway,
      payWithBank: bank.pay_with_bank,
      active: bank.active,
      country: bank.country,
      currency: bank.currency,
    };
  }
}
