import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  CreateShipmentDto,
  KYCCase,
  KYCCaseStatus,
  ProviderDashboardQuary,
  Shipment,
  ShipmentDashboard,
  ShipmentQueryFilter,
  ShipmentScheduleType,
  ShipmentStatus,
  UpdateShipmentDto,
  WalletAccount,
} from '../graphql';
import type { Prisma, Shipment as PrismaShipment } from '@prisma/client';

@Injectable()
export class ShipmentsService {
  private static readonly ACTIVE_STATUSES: ShipmentStatus[] = [
    ShipmentStatus.DRAFT,
    ShipmentStatus.CREATED,
    ShipmentStatus.BROADCASTING,
    ShipmentStatus.ASSIGNED,
    ShipmentStatus.EN_ROUTE_PICKUP,
    ShipmentStatus.PICKED_UP,
    ShipmentStatus.EN_ROUTE_DROPOFF,
  ];

  private static readonly SCHEDULED_STATUSES: ShipmentStatus[] = [
    ShipmentStatus.DRAFT,
    ShipmentStatus.CREATED,
    ShipmentStatus.BROADCASTING,
    ShipmentStatus.ASSIGNED,
  ];

  private static readonly HISTORY_STATUSES: ShipmentStatus[] = [
    ShipmentStatus.DELIVERED,
    ShipmentStatus.COMPLETED,
    ShipmentStatus.CANCELLED,
    ShipmentStatus.EXPIRED,
  ];

  private static readonly COMPLETED_STATUSES: ShipmentStatus[] = [
    ShipmentStatus.DELIVERED,
    ShipmentStatus.COMPLETED,
  ];

  private static readonly PENDING_PAYMENT_STATUSES: ShipmentStatus[] = [
    ...ShipmentsService.ACTIVE_STATUSES,
    ShipmentStatus.DELIVERED,
  ];

  private readonly allowedShipmentCurrencies: string[] = (
    process.env.ALLOWED_SHIPMENT_CURRENCIES ?? 'NGN'
  )
    .split(',')
    .map((currency) => currency.trim().toUpperCase())
    .filter(Boolean);

  private readonly defaultCommissionRateBps: number;

  constructor(private readonly prisma: PrismaService) {
    const commissionRate = parseInt(
      process.env.DEFAULT_SHIPMENT_COMMISSION_RATE_BPS ?? '1000',
      10,
    );
    this.defaultCommissionRateBps = Number.isNaN(commissionRate)
      ? 1000
      : commissionRate;
  }

  getAllowedShipmentCurrencies(): string[] {
    if (this.allowedShipmentCurrencies.length > 0) {
      return this.allowedShipmentCurrencies;
    }

    return ['NGN'];
  }

  getDefaultCommissionRateBps(): number {
    return this.defaultCommissionRateBps;
  }

  async getShipments(filter?: ShipmentQueryFilter): Promise<Shipment[]> {
    const now = new Date();
    const shipments = await this.prisma.runWithRetry(
      'ShipmentsService.getShipments',
      () =>
        this.prisma.shipment.findMany({
          where: this.buildShipmentWhereFilter(filter, now),
          orderBy: {
            createdAt: 'desc',
          },
        }),
    );

    return shipments.map((shipment) => this.toGraphqlShipment(shipment));
  }

  private buildShipmentWhereFilter(
    filter: ShipmentQueryFilter | undefined,
    now: Date,
  ): Prisma.ShipmentWhereInput | undefined {
    if (!filter) {
      return undefined;
    }

    if (filter === ShipmentQueryFilter.HISTORY) {
      return {
        status: {
          in: ShipmentsService.HISTORY_STATUSES,
        },
      };
    }

    if (filter === ShipmentQueryFilter.SCHEDULED) {
      return {
        scheduleType: ShipmentScheduleType.SCHEDULED,
        status: {
          in: ShipmentsService.SCHEDULED_STATUSES,
        },
        scheduledAt: {
          gte: now,
        },
      };
    }

    return {
      status: {
        in: ShipmentsService.ACTIVE_STATUSES,
      },
      OR: [
        {
          scheduleType: ShipmentScheduleType.INSTANT,
        },
        {
          scheduleType: ShipmentScheduleType.SCHEDULED,
          scheduledAt: null,
        },
        {
          scheduleType: ShipmentScheduleType.SCHEDULED,
          scheduledAt: {
            lte: now,
          },
        },
      ],
    };
  }

  private buildProviderShipmentWhereFilter(
    providerId: string,
    filter: ShipmentQueryFilter | undefined,
    now: Date,
  ): Prisma.ShipmentWhereInput {
    const baseFilter = this.buildShipmentWhereFilter(filter, now);

    return {
      assignment: {
        is: {
          providerId,
        },
      },
      ...(baseFilter ?? {}),
    };
  }

  async getShipmentById(id: string): Promise<Shipment | null> {
    const shipment = await this.prisma.runWithRetry(
      'ShipmentsService.getShipmentById',
      () =>
        this.prisma.shipment.findUnique({
          where: { id },
        }),
    );

    if (!shipment) {
      return null;
    }

    return this.toGraphqlShipment(shipment);
  }

  async getCustomerShipmentDashboard(
    customerProfileId: string,
  ): Promise<ShipmentDashboard> {
    const now = new Date();
    const monthStart = this.getMonthStartUtc(now);

    const [
      totalShipments,
      activeShipments,
      completedThisMonth,
      pendingPaymentShipments,
      recentShipments,
    ] = await Promise.all([
      this.prisma.runWithRetry(
        'ShipmentsService.getCustomerShipmentDashboard.totalShipments',
        () =>
          this.prisma.shipment.count({
            where: { customerProfileId },
          }),
      ),
      this.prisma.runWithRetry(
        'ShipmentsService.getCustomerShipmentDashboard.activeShipments',
        () =>
          this.prisma.shipment.count({
            where: {
              customerProfileId,
              status: {
                in: ShipmentsService.ACTIVE_STATUSES,
              },
            },
          }),
      ),
      this.prisma.runWithRetry(
        'ShipmentsService.getCustomerShipmentDashboard.completedThisMonth',
        () =>
          this.prisma.shipment.count({
            where: {
              customerProfileId,
              status: {
                in: ShipmentsService.COMPLETED_STATUSES,
              },
              updatedAt: {
                gte: monthStart,
              },
            },
          }),
      ),
      this.prisma.runWithRetry(
        'ShipmentsService.getCustomerShipmentDashboard.pendingPaymentShipments',
        () =>
          this.prisma.shipment.findMany({
            where: {
              customerProfileId,
              requiresEscrow: true,
              status: {
                in: ShipmentsService.PENDING_PAYMENT_STATUSES,
              },
            },
            select: {
              finalPriceMinor: true,
              quotedPriceMinor: true,
              pricingCurrency: true,
            },
          }),
      ),
      this.prisma.runWithRetry(
        'ShipmentsService.getCustomerShipmentDashboard.recentShipments',
        () =>
          this.prisma.shipment.findMany({
            where: { customerProfileId },
            orderBy: {
              createdAt: 'desc',
            },
            take: 6,
            select: {
              id: true,
              trackingCode: true,
              status: true,
              mode: true,
              scheduledAt: true,
              createdAt: true,
              pickupAddress: {
                select: {
                  address: true,
                  city: true,
                },
              },
              dropoffAddress: {
                select: {
                  address: true,
                  city: true,
                },
              },
            },
          }),
      ),
    ]);

    const pendingPaymentAmountMinor = pendingPaymentShipments.reduce<bigint>(
      (sum, shipment) =>
        sum + (shipment.finalPriceMinor ?? shipment.quotedPriceMinor ?? BigInt(0)),
      BigInt(0),
    );
    const pendingPaymentCurrency =
      pendingPaymentShipments[0]?.pricingCurrency ??
      this.getAllowedShipmentCurrencies()[0] ??
      'NGN';

    return {
      summary: {
        totalShipments,
        activeShipments,
        completedThisMonth,
        pendingPaymentCount: pendingPaymentShipments.length,
        pendingPaymentAmountMinor,
        pendingPaymentCurrency,
      },
      recentShipments: recentShipments.map((shipment) => ({
        id: shipment.id,
        trackingCode: shipment.trackingCode,
        status: shipment.status as ShipmentStatus,
        mode: shipment.mode,
        scheduledAt: shipment.scheduledAt ?? undefined,
        createdAt: shipment.createdAt,
        pickupAddressSummary: this.toAddressSummary(shipment.pickupAddress),
        dropoffAddressSummary: this.toAddressSummary(shipment.dropoffAddress),
      })),
    };
  }

  async getProviderDashboardQuary(
    profileId: string,
  ): Promise<ProviderDashboardQuary> {
    const now = new Date();
    const monthStart = this.getMonthStartUtc(now);
    const providerId = await this.resolveProviderIdForProfile(profileId);
    const wallet = await this.getOrCreateWalletAccount(profileId);

    if (!providerId) {
      return {
        myShipmentDashboard: {
          summary: {
            totalShipments: 0,
            activeShipments: 0,
            completedThisMonth: 0,
            pendingPaymentCount: 0,
            pendingPaymentAmountMinor: BigInt(0),
            pendingPaymentCurrency:
              wallet?.currency ??
              this.getAllowedShipmentCurrencies()[0] ??
              'NGN',
          },
          recentShipments: [],
        },
        myWallet: wallet,
        kycCases: [],
        activeAssignments: [],
        completedShipments: [],
      };
    }

    const [
      totalShipments,
      activeShipments,
      completedThisMonth,
      pendingPaymentShipments,
      recentShipments,
      activeAssignments,
      completedShipments,
      kycCases,
    ] = await Promise.all([
      this.prisma.runWithRetry(
        'ShipmentsService.getProviderDashboardQuary.totalShipments',
        () =>
          this.prisma.shipment.count({
            where: {
              assignment: {
                is: {
                  providerId,
                },
              },
            },
          }),
      ),
      this.prisma.runWithRetry(
        'ShipmentsService.getProviderDashboardQuary.activeShipments',
        () =>
          this.prisma.shipment.count({
            where: {
              assignment: {
                is: {
                  providerId,
                },
              },
              status: {
                in: ShipmentsService.ACTIVE_STATUSES,
              },
            },
          }),
      ),
      this.prisma.runWithRetry(
        'ShipmentsService.getProviderDashboardQuary.completedThisMonth',
        () =>
          this.prisma.shipment.count({
            where: {
              assignment: {
                is: {
                  providerId,
                },
              },
              status: {
                in: ShipmentsService.COMPLETED_STATUSES,
              },
              updatedAt: {
                gte: monthStart,
              },
            },
          }),
      ),
      this.prisma.runWithRetry(
        'ShipmentsService.getProviderDashboardQuary.pendingPaymentShipments',
        () =>
          this.prisma.shipment.findMany({
            where: {
              assignment: {
                is: {
                  providerId,
                },
              },
              requiresEscrow: true,
              status: {
                in: ShipmentsService.PENDING_PAYMENT_STATUSES,
              },
            },
            select: {
              finalPriceMinor: true,
              quotedPriceMinor: true,
              pricingCurrency: true,
            },
          }),
      ),
      this.prisma.runWithRetry(
        'ShipmentsService.getProviderDashboardQuary.recentShipments',
        () =>
          this.prisma.shipment.findMany({
            where: {
              assignment: {
                is: {
                  providerId,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 6,
            select: {
              id: true,
              trackingCode: true,
              status: true,
              mode: true,
              scheduledAt: true,
              createdAt: true,
              pickupAddress: {
                select: {
                  address: true,
                  city: true,
                },
              },
              dropoffAddress: {
                select: {
                  address: true,
                  city: true,
                },
              },
            },
          }),
      ),
      this.prisma.runWithRetry(
        'ShipmentsService.getProviderDashboardQuary.activeAssignments',
        () =>
          this.prisma.shipment.findMany({
            where: this.buildProviderShipmentWhereFilter(
              providerId,
              ShipmentQueryFilter.ACTIVE,
              now,
            ),
            orderBy: {
              createdAt: 'desc',
            },
          }),
      ),
      this.prisma.runWithRetry(
        'ShipmentsService.getProviderDashboardQuary.completedShipments',
        () =>
          this.prisma.shipment.findMany({
            where: this.buildProviderShipmentWhereFilter(
              providerId,
              ShipmentQueryFilter.HISTORY,
              now,
            ),
            orderBy: {
              updatedAt: 'desc',
            },
          }),
      ),
      this.prisma.runWithRetry(
        'ShipmentsService.getProviderDashboardQuary.kycCases',
        () =>
          this.prisma.providerKycCase.findMany({
            where: {
              providerId,
            },
            orderBy: {
              updatedAt: 'desc',
            },
          }),
      ),
    ]);

    const pendingPaymentAmountMinor = pendingPaymentShipments.reduce<bigint>(
      (sum, shipment) =>
        sum + (shipment.finalPriceMinor ?? shipment.quotedPriceMinor ?? BigInt(0)),
      BigInt(0),
    );
    const pendingPaymentCurrency =
      pendingPaymentShipments[0]?.pricingCurrency ??
      wallet?.currency ??
      this.getAllowedShipmentCurrencies()[0] ??
      'NGN';

    return {
      myShipmentDashboard: {
        summary: {
          totalShipments,
          activeShipments,
          completedThisMonth,
          pendingPaymentCount: pendingPaymentShipments.length,
          pendingPaymentAmountMinor,
          pendingPaymentCurrency,
        },
        recentShipments: recentShipments.map((shipment) => ({
          id: shipment.id,
          trackingCode: shipment.trackingCode,
          status: shipment.status as ShipmentStatus,
          mode: shipment.mode,
          scheduledAt: shipment.scheduledAt ?? undefined,
          createdAt: shipment.createdAt,
          pickupAddressSummary: this.toAddressSummary(shipment.pickupAddress),
          dropoffAddressSummary: this.toAddressSummary(shipment.dropoffAddress),
        })),
      },
      myWallet: wallet,
      kycCases: kycCases.map((kycCase) => this.toGraphqlKycCase(kycCase)),
      activeAssignments: activeAssignments.map((shipment) =>
        this.toGraphqlShipment(shipment),
      ),
      completedShipments: completedShipments.map((shipment) =>
        this.toGraphqlShipment(shipment),
      ),
    };
  }

  async createShipment(input: CreateShipmentDto): Promise<Shipment> {
    const shipment = await this.prisma.runWithRetry(
      'ShipmentsService.createShipment',
      () =>
        this.prisma.shipment.create({
          data: {
            trackingCode: input.trackingCode ?? this.generateTrackingCode(),
            customerProfileId: input.customerProfileId,
            mode: input.mode,
            vehicleCategory: input.vehicleCategory,
            scheduleType: input.scheduleType,
            status: ShipmentStatus.CREATED,
            pickupAddressId: input.pickupAddressId,
            dropoffAddressId: input.dropoffAddressId,
            scheduledAt: input.scheduledAt,
            packageDescription: input.packageDescription,
            packageValueMinor: input.packageValueMinor,
            specialInstructions: input.specialInstructions,
            requiresEscrow: input.requiresEscrow,
            pricingCurrency: input.pricingCurrency,
            quotedPriceMinor: input.quotedPriceMinor,
            finalPriceMinor: input.finalPriceMinor,
            commissionRateBps: this.defaultCommissionRateBps,
            commissionAmountMinor: 0,
          },
        }),
    );

    return this.toGraphqlShipment(shipment);
  }

  async updateShipment(
    id: string,
    input: UpdateShipmentDto,
  ): Promise<Shipment> {
    const existingShipment = await this.prisma.runWithRetry(
      'ShipmentsService.updateShipment.findUnique',
      () =>
        this.prisma.shipment.findUnique({
          where: { id },
          select: { id: true, commissionRateBps: true },
        }),
    );

    if (!existingShipment) {
      throw new NotFoundException(`Shipment with id ${id} not found`);
    }

    // Calculate commission if final price is being set
    let commissionAmountMinor: bigint | undefined;
    if (input.finalPriceMinor !== undefined && input.finalPriceMinor !== null) {
      const commissionRateBps =
        input.commissionRateBps ??
        existingShipment.commissionRateBps ??
        this.defaultCommissionRateBps;
      commissionAmountMinor = this.calculateCommission(
        BigInt(input.finalPriceMinor),
        commissionRateBps,
      );
    }

    const shipment = await this.prisma.runWithRetry(
      'ShipmentsService.updateShipment',
      () =>
        this.prisma.shipment.update({
          where: { id },
          data: {
            trackingCode: input.trackingCode,
            customerProfileId: input.customerProfileId,
            mode: input.mode,
            vehicleCategory: input.vehicleCategory,
            scheduleType: input.scheduleType,
            status: input.status,
            pickupAddressId: input.pickupAddressId,
            dropoffAddressId: input.dropoffAddressId,
            scheduledAt: input.scheduledAt,
            packageDescription: input.packageDescription,
            packageValueMinor: input.packageValueMinor,
            specialInstructions: input.specialInstructions,
            requiresEscrow: input.requiresEscrow,
            pricingCurrency: input.pricingCurrency,
            quotedPriceMinor: input.quotedPriceMinor,
            finalPriceMinor: input.finalPriceMinor,
            commissionRateBps: input.commissionRateBps,
            commissionAmountMinor,
            cancelledAt: input.cancelledAt,
            cancelledByProfileId: input.cancelledByProfileId,
            cancellationReason: input.cancellationReason,
          },
        }),
    );

    return this.toGraphqlShipment(shipment);
  }

  private async resolveProviderIdForProfile(
    profileId: string,
  ): Promise<string | null> {
    const provider = await this.prisma.runWithRetry(
      'ShipmentsService.resolveProviderIdForProfile.provider',
      () =>
        this.prisma.provider.findFirst({
          where: {
            profileId,
          },
          select: {
            id: true,
          },
        }),
    );

    if (provider?.id) {
      return provider.id;
    }

    const providerMember = await this.prisma.runWithRetry(
      'ShipmentsService.resolveProviderIdForProfile.providerMember',
      () =>
        this.prisma.providerMember.findFirst({
          where: {
            profileId,
            status: 'active',
          },
          orderBy: {
            createdAt: 'asc',
          },
          select: {
            providerId: true,
          },
        }),
    );

    return providerMember?.providerId ?? null;
  }

  private async getOrCreateWalletAccount(
    profileId: string,
  ): Promise<WalletAccount | null> {
    const wallet = await this.prisma.runWithRetry(
      'ShipmentsService.getOrCreateWalletAccount.findWallet',
      () =>
        this.prisma.walletAccount.findFirst({
          where: {
            ownerProfileId: profileId,
          },
        }),
    );

    if (wallet) {
      return this.toGraphqlWalletAccount(wallet);
    }

    const profile = await this.prisma.runWithRetry(
      'ShipmentsService.getOrCreateWalletAccount.findProfile',
      () =>
        this.prisma.profile.findUnique({
          where: {
            id: profileId,
          },
          select: {
            id: true,
          },
        }),
    );

    if (!profile) {
      return null;
    }

    const createdWallet = await this.prisma.runWithRetry(
      'ShipmentsService.getOrCreateWalletAccount.createWallet',
      () =>
        this.prisma.walletAccount.create({
          data: {
            ownerProfileId: profileId,
            currency: this.getAllowedShipmentCurrencies()[0] ?? 'NGN',
          },
        }),
    );

    return this.toGraphqlWalletAccount(createdWallet);
  }

  private toGraphqlWalletAccount(wallet: {
    id: string;
    ownerProfileId: string | null;
    currency: string;
    balanceMinor: bigint;
    escrowMinor: bigint;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }): WalletAccount {
    return {
      id: wallet.id,
      ownerProfileId: wallet.ownerProfileId ?? undefined,
      currency: wallet.currency,
      balanceMinor: wallet.balanceMinor,
      escrowMinor: wallet.escrowMinor,
      status: wallet.status as WalletAccount['status'],
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }

  private normalizeKycCaseStatus(status: string): KYCCaseStatus {
    const normalizedStatus = status.toLowerCase();

    if (normalizedStatus === 'pending') {
      return KYCCaseStatus.DRAFT;
    }

    if (
      Object.values(KYCCaseStatus).includes(
        normalizedStatus as KYCCaseStatus,
      )
    ) {
      return normalizedStatus as KYCCaseStatus;
    }

    return KYCCaseStatus.DRAFT;
  }

  private toGraphqlKycCase(kycCase: {
    id: string;
    providerId: string;
    status: string;
    kycLevel: number;
    ninVerified: boolean;
    phoneVerified: boolean;
    faceVerified: boolean;
    vehicleVerified: boolean;
    documentsVerified: boolean;
    submittedAt: Date | null;
    rejectionReason: string | null;
    reviewedBy: string | null;
    reviewedAt: Date | null;
    lastVerificationAttempt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): KYCCase {
    return {
      id: kycCase.id,
      providerId: kycCase.providerId,
      status: this.normalizeKycCaseStatus(kycCase.status),
      kycLevel: kycCase.kycLevel,
      ninVerified: kycCase.ninVerified,
      phoneVerified: kycCase.phoneVerified,
      faceVerified: kycCase.faceVerified,
      vehicleVerified: kycCase.vehicleVerified,
      documentsVerified: kycCase.documentsVerified,
      submittedAt: kycCase.submittedAt ?? undefined,
      rejectionReason: kycCase.rejectionReason ?? undefined,
      reviewedBy: kycCase.reviewedBy ?? undefined,
      reviewedAt: kycCase.reviewedAt ?? undefined,
      lastVerificationAttempt: kycCase.lastVerificationAttempt ?? undefined,
      createdAt: kycCase.createdAt,
      updatedAt: kycCase.updatedAt,
    };
  }

  private generateTrackingCode(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();

    return `SHP-${timestamp}-${random}`;
  }

  private calculateCommission(
    priceMinor: bigint,
    commissionRateBps: number,
  ): bigint {
    // Calculate commission: (price * bps) / 10000
    // Using BigInt arithmetic to avoid precision loss
    return (priceMinor * BigInt(commissionRateBps)) / BigInt(10000);
  }

  private toGraphqlShipment(shipment: PrismaShipment): Shipment {
    return {
      ...shipment,
      scheduledAt: shipment.scheduledAt ?? undefined,
      packageDescription: shipment.packageDescription ?? undefined,
      packageValueMinor: shipment.packageValueMinor ?? undefined,
      specialInstructions: shipment.specialInstructions ?? undefined,
      quotedPriceMinor: shipment.quotedPriceMinor ?? undefined,
      finalPriceMinor: shipment.finalPriceMinor ?? undefined,
      cancelledAt: shipment.cancelledAt ?? undefined,
      cancelledByProfileId: shipment.cancelledByProfileId ?? undefined,
      cancellationReason: shipment.cancellationReason ?? undefined,
    };
  }

  private getMonthStartUtc(date: Date): Date {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0),
    );
  }

  private toAddressSummary(address: {
    address: string;
    city: string;
  } | null): string | undefined {
    if (!address) {
      return undefined;
    }

    const primary = address.address?.trim();
    const city = address.city?.trim();

    if (!primary && !city) {
      return undefined;
    }

    return [primary, city].filter(Boolean).join(', ');
  }
}
