import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  AdminFinanceSummary,
  AdminOverview,
  AdminProviderOverview,
  ApproveRefundDto,
  DisputeCase,
  DisputeStatus,
  DispatchBatch,
  FlagFraudCaseDto,
  FraudFlag,
  FraudSeverity,
  FraudStatus,
  FraudTargetType,
  PlatformConfig,
  ProviderKycCheck,
  ProviderKycStatus,
  Refund,
  Shipment,
  ShipmentMode,
  ShipmentStatus,
  SLARule,
  SupportTicketStatus,
  CreateSlaRuleDto,
  UpdateFraudFlagStatusDto,
  UpdatePlatformConfigDto,
  UpdateSlaRuleDto,
  UserType,
} from '../graphql';
import { hasAnyProfileRole } from '../auth/utils/roles.util';

type FraudFlagRow = {
  id: string;
  flag_code: string;
  target_type: string;
  target_id: string;
  severity: string;
  status: string;
  reason: string;
  metadata: unknown;
  invoice_id: string | null;
  shipment_id: string | null;
  raised_by_profile_id: string | null;
  assigned_to_profile_id: string | null;
  resolved_by_profile_id: string | null;
  resolved_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

type PlatformConfigRow = {
  id: string;
  key: string;
  value: unknown;
  description: string | null;
  updated_by_profile_id: string | null;
  created_at: Date;
  updated_at: Date;
};

type DisputeCaseRow = {
  id: string;
  dispute_number: string;
  owner_profile_id: string;
  shipment_id: string | null;
  invoice_id: string | null;
  reference_id: string | null;
  category: string;
  reason: string;
  status: string;
  resolution_summary: string | null;
  resolved_by_profile_id: string | null;
  resolved_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

const ACTIVE_SHIPMENT_STATUSES: ShipmentStatus[] = [
  ShipmentStatus.DRAFT,
  ShipmentStatus.CREATED,
  ShipmentStatus.BROADCASTING,
  ShipmentStatus.ASSIGNED,
  ShipmentStatus.EN_ROUTE_PICKUP,
  ShipmentStatus.PICKED_UP,
  ShipmentStatus.EN_ROUTE_DROPOFF,
];

@Injectable()
export class AdminOpsService {
  constructor(private readonly prisma: PrismaService) {}

  async adminOverview(profileId: string): Promise<AdminOverview> {
    await this.assertAdmin(profileId);

    const [
      totalUsers,
      activeShipments,
      openDispatchBatches,
      openMarketplaceRequests,
      pendingKycReviews,
      walletSummary,
      openSupportTickets,
      openDisputes,
      openFraudFlags,
    ] = await Promise.all([
      this.prisma.profile.count(),
      this.prisma.shipment.count({
        where: {
          status: {
            in: ACTIVE_SHIPMENT_STATUSES,
          },
        },
      }),
      this.prisma.dispatchBatch.count({
        where: {
          status: 'open',
        },
      }),
      this.prisma.shipment.count({
        where: {
          mode: ShipmentMode.MARKETPLACE,
          status: {
            in: [ShipmentStatus.CREATED, ShipmentStatus.BROADCASTING],
          },
        },
      }),
      this.prisma.providerKycProfile.count({
        where: {
          overallStatus: {
            in: ['pending', 'failed', 'unverified'],
          },
        },
      }),
      this.prisma.walletAccount.aggregate({
        _sum: {
          balanceMinor: true,
          escrowMinor: true,
        },
      }),
      this.querySingleCount(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM "support_tickets"
        WHERE "status" IN (${SupportTicketStatus.OPEN}, ${SupportTicketStatus.IN_PROGRESS})
      `),
      this.querySingleCount(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM "dispute_cases"
        WHERE "status" IN (${DisputeStatus.OPEN}, ${DisputeStatus.INVESTIGATING})
      `),
      this.querySingleCount(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM "fraud_flags"
        WHERE "status" IN (${FraudStatus.OPEN}, ${FraudStatus.UNDER_REVIEW})
      `),
    ]);

    return {
      totalUsers,
      activeShipments,
      openDispatchBatches,
      openMarketplaceRequests,
      openSupportTickets,
      openDisputes,
      openFraudFlags,
      pendingKycReviews,
      walletBalanceMinor: walletSummary._sum.balanceMinor ?? BigInt(0),
      walletEscrowMinor: walletSummary._sum.escrowMinor ?? BigInt(0),
      currency: 'NGN',
    };
  }

  async adminLiveShipments(profileId: string): Promise<Shipment[]> {
    await this.assertAdmin(profileId);
    const shipments = await this.prisma.shipment.findMany({
      where: {
        status: {
          in: ACTIVE_SHIPMENT_STATUSES,
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 200,
    });
    return shipments.map((shipment) => this.toShipment(shipment));
  }

  async adminDispatchQueue(profileId: string): Promise<DispatchBatch[]> {
    await this.assertAdmin(profileId);
    const batches = await this.prisma.dispatchBatch.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 200,
    });
    return batches.map((batch) => ({
      ...batch,
      openedAt: batch.openedAt ?? undefined,
      closedAt: batch.closedAt ?? undefined,
      expiresAt: batch.expiresAt ?? undefined,
    }));
  }

  async adminMarketplaceBoard(profileId: string): Promise<Shipment[]> {
    await this.assertAdmin(profileId);
    const shipments = await this.prisma.shipment.findMany({
      where: {
        mode: ShipmentMode.MARKETPLACE,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 200,
    });
    return shipments.map((shipment) => this.toShipment(shipment));
  }

  async adminProviders(profileId: string): Promise<AdminProviderOverview[]> {
    await this.assertAdmin(profileId);

    const providers = await this.prisma.provider.findMany({
      include: {
        _count: {
          select: {
            shipmentAssignments: true,
            dispatchOffers: true,
          },
        },
        kycProfile: {
          select: {
            overallStatus: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 200,
    });

    return providers.map((provider) => ({
      id: provider.id,
      businessName: provider.businessName,
      status: provider.status,
      activeAssignments: provider._count.shipmentAssignments,
      openOffers: provider._count.dispatchOffers,
      kycStatus: provider.kycProfile?.overallStatus ?? 'unverified',
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
    }));
  }

  async adminProviderKyc(
    profileId: string,
    providerId: string,
  ): Promise<ProviderKycStatus | null> {
    await this.assertAdmin(profileId);

    const status = await this.prisma.providerKycProfile.findUnique({
      where: {
        providerId,
      },
    });

    if (!status) {
      return null;
    }

    return {
      id: status.id,
      providerId: status.providerId,
      overallStatus: status.overallStatus,
      kycLevel: status.kycLevel,
      ninStatus: status.ninStatus,
      phoneStatus: status.phoneStatus,
      faceStatus: status.faceStatus,
      vehiclePlateStatus: status.vehiclePlateStatus,
      vehicleVinStatus: status.vehicleVinStatus,
      ninVerifiedAt: status.ninVerifiedAt ?? undefined,
      phoneVerifiedAt: status.phoneVerifiedAt ?? undefined,
      faceVerifiedAt: status.faceVerifiedAt ?? undefined,
      vehiclePlateVerifiedAt: status.vehiclePlateVerifiedAt ?? undefined,
      vehicleVinVerifiedAt: status.vehicleVinVerifiedAt ?? undefined,
      faceConfidence: status.faceConfidence ? Number(status.faceConfidence) : undefined,
      maskedNin: status.maskedNin ?? undefined,
      maskedPhone: status.maskedPhone ?? undefined,
      failureSummary: status.failureSummary ?? undefined,
      lastVendorSyncAt: status.lastVendorSyncAt ?? undefined,
      lastCheckAt: status.lastCheckAt ?? undefined,
      createdAt: status.createdAt,
      updatedAt: status.updatedAt,
    };
  }

  async adminProviderKycChecks(
    profileId: string,
    providerId: string,
  ): Promise<ProviderKycCheck[]> {
    await this.assertAdmin(profileId);

    const checks = await this.prisma.providerKycCheck.findMany({
      where: {
        providerId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 200,
    });

    return checks.map((item) => ({
      id: item.id,
      providerId: item.providerId,
      profileId: item.profileId ?? undefined,
      vehicleId: item.vehicleId ?? undefined,
      checkType: item.checkType,
      status: item.status,
      vendor: item.vendor,
      vendorReference: item.vendorReference ?? undefined,
      responseCode: item.responseCode ?? undefined,
      confidence: item.confidence ? Number(item.confidence) : undefined,
      message: item.message ?? undefined,
      maskedIdentifier: item.maskedIdentifier ?? undefined,
      normalizedData: item.normalizedData as Record<string, unknown> | undefined,
      expiresAt: item.expiresAt ?? undefined,
      verifiedAt: item.verifiedAt ?? undefined,
      failedAt: item.failedAt ?? undefined,
      initiatedByProfileId: item.initiatedByProfileId ?? undefined,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
  }

  async adminDisputes(profileId: string): Promise<DisputeCase[]> {
    await this.assertAdmin(profileId);

    const rows = await this.prisma.$queryRaw<DisputeCaseRow[]>`
      SELECT *
      FROM "dispute_cases"
      ORDER BY "updated_at" DESC
      LIMIT 200
    `;

    return rows.map((row) => ({
      id: row.id,
      disputeNumber: row.dispute_number,
      ownerProfileId: row.owner_profile_id,
      shipmentId: row.shipment_id ?? undefined,
      invoiceId: row.invoice_id ?? undefined,
      referenceId: row.reference_id ?? undefined,
      category: row.category,
      reason: row.reason,
      status: row.status as DisputeStatus,
      resolutionSummary: row.resolution_summary ?? undefined,
      resolvedByProfileId: row.resolved_by_profile_id ?? undefined,
      resolvedAt: row.resolved_at ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async adminFraudFlags(profileId: string): Promise<FraudFlag[]> {
    await this.assertAdmin(profileId);
    const rows = await this.prisma.$queryRaw<FraudFlagRow[]>`
      SELECT *
      FROM "fraud_flags"
      ORDER BY "updated_at" DESC
      LIMIT 200
    `;
    return rows.map((row) => this.toFraudFlag(row));
  }

  async adminSlaRules(profileId: string): Promise<SLARule[]> {
    await this.assertAdmin(profileId);
    const rules = await this.prisma.slaRule.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
    return rules.map((rule) => ({
      id: rule.id,
      key: rule.key,
      scope: rule.scope as SLARule['scope'],
      vehicleCategory: rule.vehicleCategory ?? undefined,
      providerId: rule.providerId ?? undefined,
      value: rule.value,
      isActive: rule.isActive,
      createdAt: rule.createdAt,
    }));
  }

  async adminFinanceSummary(profileId: string): Promise<AdminFinanceSummary> {
    await this.assertAdmin(profileId);

    const [walletSummary, pendingRefunds, overdueInvoiceSummary] = await Promise.all([
      this.prisma.walletAccount.aggregate({
        _sum: {
          balanceMinor: true,
          escrowMinor: true,
        },
      }),
      this.prisma.refund.aggregate({
        where: {
          status: 'pending',
        },
        _count: {
          _all: true,
        },
        _sum: {
          amountMinor: true,
        },
      }),
      this.prisma.$queryRaw<
        Array<{ count: bigint | number | string; total: bigint | number | string | null }>
      >`
        SELECT
          COUNT(*)::bigint AS count,
          COALESCE(SUM("total_minor"), 0)::bigint AS total
        FROM "invoices"
        WHERE "status" IN ('pending', 'overdue')
          AND "due_at" IS NOT NULL
          AND "due_at" < NOW()
      `,
    ]);

    const overdue = overdueInvoiceSummary[0] ?? { count: BigInt(0), total: BigInt(0) };

    return {
      currency: 'NGN',
      totalWalletBalanceMinor: walletSummary._sum.balanceMinor ?? BigInt(0),
      totalEscrowMinor: walletSummary._sum.escrowMinor ?? BigInt(0),
      pendingRefundCount: pendingRefunds._count._all,
      pendingRefundAmountMinor: pendingRefunds._sum.amountMinor ?? BigInt(0),
      overdueInvoiceCount: Number(this.toBigInt(overdue.count)),
      overdueInvoiceAmountMinor: this.toBigInt(overdue.total ?? BigInt(0)),
    };
  }

  async adminConfig(profileId: string): Promise<PlatformConfig[]> {
    await this.assertAdmin(profileId);
    const rows = await this.prisma.$queryRaw<PlatformConfigRow[]>`
      SELECT *
      FROM "platform_configs"
      ORDER BY "key" ASC
    `;
    return rows.map((row) => this.toPlatformConfig(row));
  }

  async flagFraudCase(profileId: string, input: FlagFraudCaseDto): Promise<FraudFlag> {
    await this.assertAdmin(profileId);

    const flagCode = this.generateReference('FRD');
    const now = new Date();
    const [row] = await this.prisma.$queryRaw<FraudFlagRow[]>(Prisma.sql`
      INSERT INTO "fraud_flags" (
        "id",
        "flag_code",
        "target_type",
        "target_id",
        "severity",
        "status",
        "reason",
        "metadata",
        "invoice_id",
        "shipment_id",
        "raised_by_profile_id",
        "created_at",
        "updated_at"
      )
      VALUES (
        gen_random_uuid(),
        ${flagCode},
        ${input.targetType},
        ${input.targetId},
        ${input.severity ?? FraudSeverity.MEDIUM},
        ${FraudStatus.OPEN},
        ${input.reason.trim()},
        ${input.metadata as Prisma.InputJsonValue | null},
        ${input.invoiceId ? Prisma.sql`${input.invoiceId}::uuid` : Prisma.sql`NULL`},
        ${input.shipmentId ? Prisma.sql`${input.shipmentId}::uuid` : Prisma.sql`NULL`},
        ${profileId}::uuid,
        ${now},
        ${now}
      )
      RETURNING *
    `);

    return this.toFraudFlag(row);
  }

  async updateFraudFlagStatus(
    profileId: string,
    input: UpdateFraudFlagStatusDto,
  ): Promise<FraudFlag> {
    await this.assertAdmin(profileId);
    const now = new Date();
    const isResolvedState =
      input.status === FraudStatus.RESOLVED || input.status === FraudStatus.DISMISSED;

    const [row] = await this.prisma.$queryRaw<FraudFlagRow[]>(Prisma.sql`
      UPDATE "fraud_flags"
      SET
        "status" = ${input.status},
        "resolved_by_profile_id" = ${isResolvedState ? Prisma.sql`${profileId}::uuid` : Prisma.sql`NULL`},
        "resolved_at" = ${isResolvedState ? now : null},
        "updated_at" = ${now}
      WHERE "id" = ${input.fraudFlagId}::uuid
      RETURNING *
    `);

    if (!row) {
      throw new NotFoundException(`Fraud flag with id ${input.fraudFlagId} not found`);
    }

    return this.toFraudFlag(row);
  }

  async createSlaRule(profileId: string, input: CreateSlaRuleDto): Promise<SLARule> {
    await this.assertAdmin(profileId);
    const rule = await this.prisma.slaRule.create({
      data: {
        key: input.key.trim(),
        scope: input.scope,
        value: input.value as Prisma.InputJsonValue,
        providerId: input.providerId ?? undefined,
        vehicleCategory: input.vehicleCategory ?? undefined,
        isActive: input.isActive ?? true,
      },
    });
    return {
      id: rule.id,
      key: rule.key,
      scope: rule.scope as SLARule['scope'],
      vehicleCategory: rule.vehicleCategory ?? undefined,
      providerId: rule.providerId ?? undefined,
      value: rule.value,
      isActive: rule.isActive,
      createdAt: rule.createdAt,
    };
  }

  async updateSlaRule(profileId: string, input: UpdateSlaRuleDto): Promise<SLARule> {
    await this.assertAdmin(profileId);
    const rule = await this.prisma.slaRule.update({
      where: {
        id: input.id,
      },
      data: {
        value: input.value as Prisma.InputJsonValue | undefined,
        isActive: input.isActive ?? undefined,
      },
    });
    return {
      id: rule.id,
      key: rule.key,
      scope: rule.scope as SLARule['scope'],
      vehicleCategory: rule.vehicleCategory ?? undefined,
      providerId: rule.providerId ?? undefined,
      value: rule.value,
      isActive: rule.isActive,
      createdAt: rule.createdAt,
    };
  }

  async approveRefund(profileId: string, input: ApproveRefundDto): Promise<Refund> {
    await this.assertAdmin(profileId);
    const status = input.approved ? 'succeeded' : 'failed';
    const updated = await this.prisma.refund.update({
      where: {
        id: input.refundId,
      },
      data: {
        status,
        approvedByProfileId: profileId,
        approvedAt: new Date(),
      },
    });
    return {
      id: updated.id,
      transactionId: updated.transactionId,
      shipmentId: updated.shipmentId,
      initiatedByProfileId: updated.initiatedByProfileId,
      amountMinor: updated.amountMinor,
      currency: updated.currency,
      status: updated.status as Refund['status'],
      reason: updated.reason ?? undefined,
      approvedByProfileId: updated.approvedByProfileId ?? undefined,
      approvedAt: updated.approvedAt ?? undefined,
      processedAt: updated.processedAt ?? undefined,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async updatePlatformConfig(
    profileId: string,
    input: UpdatePlatformConfigDto,
  ): Promise<PlatformConfig> {
    await this.assertAdmin(profileId);
    const now = new Date();
    const [row] = await this.prisma.$queryRaw<PlatformConfigRow[]>(Prisma.sql`
      INSERT INTO "platform_configs" (
        "id",
        "key",
        "value",
        "description",
        "updated_by_profile_id",
        "created_at",
        "updated_at"
      )
      VALUES (
        gen_random_uuid(),
        ${input.key.trim()},
        ${input.value as Prisma.InputJsonValue},
        ${input.description?.trim() || null},
        ${profileId}::uuid,
        ${now},
        ${now}
      )
      ON CONFLICT ("key")
      DO UPDATE SET
        "value" = EXCLUDED."value",
        "description" = EXCLUDED."description",
        "updated_by_profile_id" = EXCLUDED."updated_by_profile_id",
        "updated_at" = EXCLUDED."updated_at"
      RETURNING *
    `);

    return this.toPlatformConfig(row);
  }

  private async assertAdmin(profileId: string): Promise<void> {
    const profile = await this.prisma.profile.findUnique({
      where: {
        id: profileId,
      },
      select: {
        roles: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    if (!hasAnyProfileRole(profile, [UserType.ADMIN])) {
      throw new ForbiddenException('Admin role is required');
    }
  }

  private toShipment(shipment: {
    id: string;
    trackingCode: string;
    customerProfileId: string;
    mode: string;
    vehicleCategory: string;
    scheduleType: string;
    status: string;
    pickupAddressId: string;
    dropoffAddressId: string;
    scheduledAt: Date | null;
    packageDescription: string | null;
    packageValueMinor: bigint | null;
    specialInstructions: string | null;
    requiresEscrow: boolean;
    pricingCurrency: string;
    quotedPriceMinor: bigint | null;
    finalPriceMinor: bigint | null;
    commissionRateBps: number;
    commissionAmountMinor: bigint;
    createdAt: Date;
    updatedAt: Date;
    cancelledAt: Date | null;
    cancelledByProfileId: string | null;
    cancellationReason: string | null;
  }): Shipment {
    return {
      id: shipment.id,
      trackingCode: shipment.trackingCode,
      customerProfileId: shipment.customerProfileId,
      mode: shipment.mode as ShipmentMode,
      vehicleCategory: shipment.vehicleCategory as Shipment['vehicleCategory'],
      scheduleType: shipment.scheduleType as Shipment['scheduleType'],
      status: shipment.status as ShipmentStatus,
      pickupAddressId: shipment.pickupAddressId,
      dropoffAddressId: shipment.dropoffAddressId,
      scheduledAt: shipment.scheduledAt ?? undefined,
      packageDescription: shipment.packageDescription ?? undefined,
      packageValueMinor: shipment.packageValueMinor ?? undefined,
      specialInstructions: shipment.specialInstructions ?? undefined,
      requiresEscrow: shipment.requiresEscrow,
      pricingCurrency: shipment.pricingCurrency,
      quotedPriceMinor: shipment.quotedPriceMinor ?? undefined,
      finalPriceMinor: shipment.finalPriceMinor ?? undefined,
      commissionRateBps: shipment.commissionRateBps,
      commissionAmountMinor: shipment.commissionAmountMinor,
      createdAt: shipment.createdAt,
      updatedAt: shipment.updatedAt,
      cancelledAt: shipment.cancelledAt ?? undefined,
      cancelledByProfileId: shipment.cancelledByProfileId ?? undefined,
      cancellationReason: shipment.cancellationReason ?? undefined,
    };
  }

  private async querySingleCount(query: Prisma.Sql): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ count: bigint | number | string }>>(query);
    if (!rows[0]) {
      return 0;
    }
    return Number(this.toBigInt(rows[0].count));
  }

  private toFraudFlag(row: FraudFlagRow): FraudFlag {
    return {
      id: row.id,
      flagCode: row.flag_code,
      targetType: row.target_type as FraudTargetType,
      targetId: row.target_id,
      severity: row.severity as FraudSeverity,
      status: row.status as FraudStatus,
      reason: row.reason,
      metadata: row.metadata ?? undefined,
      invoiceId: row.invoice_id ?? undefined,
      shipmentId: row.shipment_id ?? undefined,
      raisedByProfileId: row.raised_by_profile_id ?? undefined,
      assignedToProfileId: row.assigned_to_profile_id ?? undefined,
      resolvedByProfileId: row.resolved_by_profile_id ?? undefined,
      resolvedAt: row.resolved_at ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private toPlatformConfig(row: PlatformConfigRow): PlatformConfig {
    return {
      id: row.id,
      key: row.key,
      value: row.value,
      description: row.description ?? undefined,
      updatedByProfileId: row.updated_by_profile_id ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private toBigInt(value: unknown): bigint {
    if (typeof value === 'bigint') {
      return value;
    }
    if (typeof value === 'number') {
      return BigInt(Math.trunc(value));
    }
    if (typeof value === 'string') {
      return BigInt(value);
    }
    return BigInt(0);
  }

  private generateReference(prefix: string): string {
    const random = Math.random().toString().slice(2, 8);
    return `${prefix}-${random}`;
  }
}
