import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import {
  AddShipmentItemDto,
  CancelShipmentDto,
  CreateShipmentDto,
  EstimateShipmentBasePriceDto,
  NotificationAudience,
  NotificationCategory,
  ProviderKycStatus,
  ProviderDashboardQuary,
  Shipment,
  ShipmentActorRole,
  ShipmentAssignmentStatus,
  ShipmentDashboard,
  ShipmentEvent,
  ShipmentEventType,
  ShipmentItem,
  ShipmentMilestone,
  ShipmentMilestoneStatus,
  ShipmentMilestoneType,
  ShipmentMode,
  ShipmentQueryFilter,
  ShipmentScheduleType,
  ShipmentStatus,
  ShipmentTracking,
  ShipmentBasePriceEstimate,
  TransactionDirection,
  TransactionStatus,
  UpdateShipmentDto,
  UserType,
  UserAddress,
  WalletAccount,
  State,
} from '../graphql';
import type {
  ShipmentEvent as PrismaShipmentEvent,
  ShipmentAssignment as PrismaShipmentAssignment,
  ShipmentItem as PrismaShipmentItem,
  ShipmentMilestone as PrismaShipmentMilestone,
  UserAddress as PrismaUserAddress,
  Prisma,
  Shipment as PrismaShipment,
} from '@prisma/client';
import {
  normalizeProfileRoles,
  resolveProfileRole,
} from '../auth/utils/roles.util';
import {
  DISPATCH_QUEUE_NAME,
  DISPATCH_SHIPMENT_JOB,
  type DispatchShipmentJobPayload,
} from '../queue/queue.constants';
import { NotificationsService } from '../notifications/notifications.service';
import { UserService } from '../user/user.service';

@Injectable()
export class ShipmentsService {
  private readonly logger = new Logger(ShipmentsService.name);

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

  private static readonly CANCELLABLE_STATUSES: ShipmentStatus[] = [
    ShipmentStatus.DRAFT,
    ShipmentStatus.CREATED,
    ShipmentStatus.BROADCASTING,
    ShipmentStatus.ASSIGNED,
    ShipmentStatus.EN_ROUTE_PICKUP,
    ShipmentStatus.PICKED_UP,
    ShipmentStatus.EN_ROUTE_DROPOFF,
    ShipmentStatus.DELIVERED,
  ];

  private static readonly STATUS_TO_EVENT_TYPE: Partial<
    Record<ShipmentStatus, ShipmentEventType>
  > = {
    [ShipmentStatus.CREATED]: ShipmentEventType.CREATED,
    [ShipmentStatus.BROADCASTING]: ShipmentEventType.BROADCASTED,
    [ShipmentStatus.ASSIGNED]: ShipmentEventType.ASSIGNED,
    [ShipmentStatus.PICKED_UP]: ShipmentEventType.PICKED_UP,
    [ShipmentStatus.DELIVERED]: ShipmentEventType.DELIVERED,
    [ShipmentStatus.COMPLETED]: ShipmentEventType.COMPLETED,
    [ShipmentStatus.CANCELLED]: ShipmentEventType.CANCELLED,
  };

  private static readonly STATUS_TO_MILESTONE: Partial<
    Record<ShipmentStatus, ShipmentMilestoneType>
  > = {
    [ShipmentStatus.ASSIGNED]: ShipmentMilestoneType.ACCEPTED,
    [ShipmentStatus.EN_ROUTE_PICKUP]: ShipmentMilestoneType.ARRIVED_PICKUP,
    [ShipmentStatus.PICKED_UP]: ShipmentMilestoneType.PICKED_UP,
    [ShipmentStatus.EN_ROUTE_DROPOFF]: ShipmentMilestoneType.ARRIVED_DROPOFF,
    [ShipmentStatus.DELIVERED]: ShipmentMilestoneType.DELIVERED,
    [ShipmentStatus.COMPLETED]: ShipmentMilestoneType.COMPLETED,
  };

  private readonly allowedShipmentCurrencies: string[] = (
    process.env.ALLOWED_SHIPMENT_CURRENCIES ?? 'NGN'
  )
    .split(',')
    .map((currency) => currency.trim().toUpperCase())
    .filter(Boolean);

  private readonly defaultCommissionRateBps: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly userService: UserService,
    @InjectQueue(DISPATCH_QUEUE_NAME)
    private readonly dispatchQueue: Queue<DispatchShipmentJobPayload>,
  ) {
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

  async estimateShipmentBasePrice(
    viewerProfileId: string,
    input: EstimateShipmentBasePriceDto,
  ): Promise<ShipmentBasePriceEstimate> {
    const viewerRole = await this.requireUserRole(viewerProfileId, [
      UserType.ADMIN,
      UserType.INDIVIDUAL,
      UserType.BUSINESS,
    ]);

    return this.buildShipmentBasePriceEstimate(input, {
      allowedProfileId: viewerProfileId,
      allowAnyAddress: viewerRole === UserType.ADMIN,
    });
  }

  async getShipmentsForViewer(
    viewerProfileId: string,
    filter?: ShipmentQueryFilter,
  ): Promise<Shipment[]> {
    const now = new Date();
    const viewerRole = await this.requireUserRole(viewerProfileId, [
      UserType.ADMIN,
      UserType.INDIVIDUAL,
    ]);
    const viewerWhere = await this.buildViewerShipmentWhereFilter(
      viewerProfileId,
      viewerRole,
    );

    if (viewerWhere === null) {
      return [];
    }

    const baseFilter = this.buildShipmentWhereFilter(filter, now);
    const where: Prisma.ShipmentWhereInput = {
      ...(baseFilter ?? {}),
      ...(viewerWhere ?? {}),
    };

    const shipments = await this.prisma.shipment.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        items: true,
        pickupAddress: true,
        dropoffAddress: true,
      },
    });

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

  async getShipmentByIdForViewer(
    viewerProfileId: string,
    id: string,
  ): Promise<Shipment | null> {
    const viewerRoles = await this.requireUserRoles(viewerProfileId);
    const shipment = await this.prisma.shipment.findUnique({
      where: { id },
      include: {
        items: true,
        pickupAddress: true,
        dropoffAddress: true,
      },
    });

    if (!shipment) {
      return null;
    }

    const hasAccess = await this.canAccessShipmentForRoles(
      viewerProfileId,
      viewerRoles,
      shipment.id,
      shipment.customerProfileId,
    );
    if (!hasAccess) {
      throw new ForbiddenException(
        'You are not allowed to access this shipment',
      );
    }

    return {
      ...this.toGraphqlShipment(shipment),
      pickupAddressSummary: this.toAddressSummary(shipment.pickupAddress),
      dropoffAddressSummary: this.toAddressSummary(shipment.dropoffAddress),
    };
  }

  async getShipmentTimelineForViewer(
    viewerProfileId: string,
    shipmentId: string,
  ): Promise<ShipmentEvent[]> {
    await this.assertViewerCanAccessShipment(viewerProfileId, shipmentId);

    const events = await this.prisma.shipmentEvent.findMany({
      where: {
        shipmentId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return events.map((event) => this.toGraphqlShipmentEvent(event));
  }

  async getShipmentTrackingForViewer(
    viewerProfileId: string,
    shipmentId: string,
  ): Promise<ShipmentTracking> {
    await this.assertViewerCanAccessShipment(viewerProfileId, shipmentId);

    const shipment = await this.prisma.shipment.findUnique({
      where: {
        id: shipmentId,
      },
      include: {
        items: true,
        pickupAddress: true,
        dropoffAddress: true,
      },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment with id ${shipmentId} not found`);
    }

    const [events, milestones] = await Promise.all([
      this.prisma.shipmentEvent.findMany({
        where: {
          shipmentId,
        },
        orderBy: {
          createdAt: 'asc',
        },
      }),
      this.prisma.shipmentMilestone.findMany({
        where: {
          shipmentId,
        },
        orderBy: {
          createdAt: 'asc',
        },
      }),
    ]);

    return {
      shipment: {
        ...this.toGraphqlShipment(shipment),
        pickupAddressSummary: this.toAddressSummary(shipment.pickupAddress),
        dropoffAddressSummary: this.toAddressSummary(shipment.dropoffAddress),
      },
      events: events.map((event) => this.toGraphqlShipmentEvent(event)),
      milestones: milestones.map((milestone) =>
        this.toGraphqlShipmentMilestone(milestone),
      ),
    };
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
      this.prisma.shipment.count({
        where: { customerProfileId },
      }),
      this.prisma.shipment.count({
        where: {
          customerProfileId,
          status: {
            in: ShipmentsService.ACTIVE_STATUSES,
          },
        },
      }),
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
    ]);

    const pendingPaymentAmountMinor = pendingPaymentShipments.reduce<bigint>(
      (sum, shipment) =>
        sum +
        (shipment.finalPriceMinor ?? shipment.quotedPriceMinor ?? BigInt(0)),
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
    const viewerRole = await this.requireUserRole(profileId, [
      UserType.ADMIN,
      UserType.BUSINESS,
    ]);
    const providerId =
      viewerRole === UserType.ADMIN
        ? await this.resolveProviderIdForProfile(profileId)
        : await this.requireOperationalProviderId(profileId);
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
        kycStatus: null,
        activeAssignments: [],
        completedShipments: [],
        cancelledShipmentsCount: 0,
        completionRate: 0,
        dispatchStats: {
          offersReceived: 0,
          offersAccepted: 0,
          offersDeclined: 0,
          offersExpired: 0,
          acceptanceRate: 0,
        },
        earningsSummary: {
          totalEarningsMinor: BigInt(0),
          earningsThisMonthMinor: BigInt(0),
          currency: wallet?.currency ?? 'NGN',
        },
        performance: {
          ratingAvg: 0,
          ratingCount: 0,
          priorityScore: 0,
          isAvailable: false,
          teamMembersCount: 0,
          penaltiesCount: 0,
          penaltyPoints: 0,
        },
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
      kycStatus,
      providerRecord,
      offersReceived,
      offersAccepted,
      offersDeclined,
      offersExpired,
      totalEarningsAgg,
      monthEarningsAgg,
      teamMembersCount,
      cancelledShipmentsCount,
      penaltiesAgg,
    ] = await Promise.all([
      this.prisma.shipment.count({
        where: {
          assignment: {
            is: {
              providerId,
            },
          },
        },
      }),
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
      this.prisma.providerKycProfile.findUnique({
        where: {
          providerId,
        },
      }),
      this.prisma.provider.findUnique({
        where: { id: providerId },
        select: {
          ratingAvg: true,
          ratingCount: true,
          priorityScore: true,
          isAvailable: true,
        },
      }),
      this.prisma.dispatchOffer.count({ where: { providerId } }),
      this.prisma.dispatchOffer.count({
        where: { providerId, status: 'accepted' },
      }),
      this.prisma.dispatchOffer.count({
        where: { providerId, status: 'declined' },
      }),
      this.prisma.dispatchOffer.count({
        where: { providerId, status: 'expired' },
      }),
      wallet?.id
        ? this.prisma.walletTransaction.aggregate({
            where: {
              walletAccountId: wallet.id,
              direction: TransactionDirection.CREDIT,
              status: TransactionStatus.COMPLETED,
            },
            _sum: { amountMinor: true },
          })
        : Promise.resolve({ _sum: { amountMinor: null } }),
      wallet?.id
        ? this.prisma.walletTransaction.aggregate({
            where: {
              walletAccountId: wallet.id,
              direction: TransactionDirection.CREDIT,
              status: TransactionStatus.COMPLETED,
              createdAt: { gte: monthStart },
            },
            _sum: { amountMinor: true },
          })
        : Promise.resolve({ _sum: { amountMinor: null } }),
      this.prisma.providerMember.count({ where: { providerId } }),
      this.prisma.shipment.count({
        where: {
          assignment: { is: { providerId } },
          status: ShipmentStatus.CANCELLED,
        },
      }),
      this.prisma.providerPenalty.aggregate({
        where: { providerId },
        _count: { id: true },
        _sum: { points: true },
      }),
    ]);

    const pendingPaymentAmountMinor = pendingPaymentShipments.reduce<bigint>(
      (sum, shipment) =>
        sum +
        (shipment.finalPriceMinor ?? shipment.quotedPriceMinor ?? BigInt(0)),
      BigInt(0),
    );
    const pendingPaymentCurrency =
      pendingPaymentShipments[0]?.pricingCurrency ??
      wallet?.currency ??
      this.getAllowedShipmentCurrencies()[0] ??
      'NGN';

    const completedCount = completedShipments.length;
    const completionRate =
      completedCount + cancelledShipmentsCount > 0
        ? Math.round(
            (completedCount / (completedCount + cancelledShipmentsCount)) * 100,
          )
        : 0;

    const acceptanceRate =
      offersReceived > 0
        ? Math.round((offersAccepted / offersReceived) * 100)
        : 0;

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
      kycStatus: kycStatus ? this.toGraphqlProviderKycStatus(kycStatus) : null,
      activeAssignments: activeAssignments.map((shipment) =>
        this.toGraphqlShipment(shipment),
      ),
      completedShipments: completedShipments.map((shipment) =>
        this.toGraphqlShipment(shipment),
      ),
      cancelledShipmentsCount,
      completionRate,
      dispatchStats: {
        offersReceived,
        offersAccepted,
        offersDeclined,
        offersExpired,
        acceptanceRate,
      },
      earningsSummary: {
        totalEarningsMinor: totalEarningsAgg._sum.amountMinor ?? BigInt(0),
        earningsThisMonthMinor: monthEarningsAgg._sum.amountMinor ?? BigInt(0),
        currency: wallet?.currency ?? 'NGN',
      },
      performance: {
        ratingAvg: providerRecord?.ratingAvg
          ? Number(providerRecord.ratingAvg)
          : 0,
        ratingCount: providerRecord?.ratingCount ?? 0,
        priorityScore: providerRecord?.priorityScore ?? 0,
        isAvailable: providerRecord?.isAvailable ?? false,
        teamMembersCount,
        penaltiesCount: penaltiesAgg._count.id,
        penaltyPoints: penaltiesAgg._sum.points ?? 0,
      },
    };
  }

  async createShipment(input: CreateShipmentDto): Promise<Shipment> {
    const basePriceEstimate =
      input.quotedPriceMinor == null || input.finalPriceMinor == null
        ? await this.buildShipmentBasePriceEstimate(
            {
              pickupAddressId: input.pickupAddressId,
              dropoffAddressId: input.dropoffAddressId,
              currency: input.pricingCurrency ?? undefined,
            },
            {
              allowedProfileId: input.customerProfileId,
              allowAnyAddress: false,
            },
          )
        : null;

    const quotedPriceMinor =
      input.quotedPriceMinor ?? basePriceEstimate?.basePriceMinor ?? null;
    const finalPriceMinor =
      input.finalPriceMinor ?? quotedPriceMinor ?? null;
    const pricingCurrency =
      input.pricingCurrency ??
      basePriceEstimate?.currency ??
      this.getAllowedShipmentCurrencies()[0] ??
      'NGN';
    const commissionAmountMinor =
      finalPriceMinor != null
        ? this.calculateCommission(finalPriceMinor, this.defaultCommissionRateBps)
        : BigInt(0);

    const shipment = await this.prisma.$transaction(async (tx) => {
      const createdShipment = await tx.shipment.create({
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
          pricingCurrency,
          quotedPriceMinor,
          finalPriceMinor,
          commissionRateBps: this.defaultCommissionRateBps,
          commissionAmountMinor,
        },
      });

      await tx.shipmentEvent.create({
        data: {
          shipmentId: createdShipment.id,
          eventType: ShipmentEventType.CREATED,
          actorProfileId: input.customerProfileId,
          actorRole: ShipmentActorRole.CUSTOMER,
          metadata: {
            mode: createdShipment.mode,
            vehicleCategory: createdShipment.vehicleCategory,
          } as Prisma.InputJsonValue,
        },
      });

      await this.createInitialMilestones(tx, createdShipment.id);
      return createdShipment;
    });

    await this.enqueueDispatchShipmentIfRequired(shipment);

    const customerAudience = await this.resolveNotificationAudience(
      shipment.customerProfileId,
    );
    await this.notifications.createNotification({
      recipientProfileId: shipment.customerProfileId,
      audience: customerAudience,
      category: NotificationCategory.SHIPMENT,
      title: `Shipment ${shipment.trackingCode} created`,
      body: 'Your shipment is now in the dispatch pipeline.',
      entityType: 'shipment',
      entityId: shipment.id,
      metadata: {
        status: shipment.status,
        mode: shipment.mode,
      },
    });

    await this.notifications.notifyAdmins({
      category: NotificationCategory.SHIPMENT,
      title: `New shipment ${shipment.trackingCode}`,
      body: `${shipment.mode} ${shipment.vehicleCategory} shipment created.`,
      entityType: 'shipment',
      entityId: shipment.id,
      metadata: {
        customerProfileId: shipment.customerProfileId,
      },
    });

    return this.toGraphqlShipment(shipment);
  }

  async updateShipment(
    viewerProfileId: string,
    id: string,
    input: UpdateShipmentDto,
  ): Promise<Shipment> {
    const viewerRole = await this.requireUserRole(viewerProfileId, [
      UserType.ADMIN,
      UserType.INDIVIDUAL,
    ]);
    const existingShipment = await this.prisma.shipment.findUnique({
      where: { id },
      select: {
        id: true,
        commissionRateBps: true,
        customerProfileId: true,
        status: true,
      },
    });

    if (!existingShipment) {
      throw new NotFoundException(`Shipment with id ${id} not found`);
    }

    const canMutate =
      viewerRole === UserType.ADMIN ||
      existingShipment.customerProfileId === viewerProfileId;
    if (!canMutate) {
      throw new ForbiddenException(
        'You are not allowed to update this shipment',
      );
    }

    if (
      existingShipment.status === ShipmentStatus.CANCELLED ||
      existingShipment.status === ShipmentStatus.COMPLETED ||
      existingShipment.status === ShipmentStatus.EXPIRED
    ) {
      throw new BadRequestException(
        `Cannot update shipment in ${existingShipment.status} status`,
      );
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

    const statusChanged =
      input.status !== undefined && input.status !== existingShipment.status;
    const eventType =
      (input.status && ShipmentsService.STATUS_TO_EVENT_TYPE[input.status]) ??
      undefined;
    const milestoneType =
      (input.status && ShipmentsService.STATUS_TO_MILESTONE[input.status]) ??
      undefined;

    const shipment = await this.prisma.$transaction(async (tx) => {
      const updatedShipment = await tx.shipment.update({
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
      });

      if (statusChanged && eventType) {
        await tx.shipmentEvent.create({
          data: {
            shipmentId: id,
            eventType,
            actorProfileId: viewerProfileId,
            actorRole:
              viewerRole === UserType.ADMIN
                ? ShipmentActorRole.ADMIN
                : ShipmentActorRole.CUSTOMER,
            metadata: {
              previousStatus: existingShipment.status,
              nextStatus: input.status,
            } as Prisma.InputJsonValue,
          },
        });
      }

      if (statusChanged && milestoneType) {
        await this.markShipmentMilestoneReached(
          tx,
          id,
          milestoneType,
          input.status === ShipmentStatus.COMPLETED
            ? ShipmentMilestoneStatus.VERIFIED
            : ShipmentMilestoneStatus.REACHED,
        );
      }

      return updatedShipment;
    });

    if (statusChanged && input.status) {
      await this.notifyShipmentStatusChange({
        shipmentId: shipment.id,
        trackingCode: shipment.trackingCode,
        status: input.status,
        actorProfileId: viewerProfileId,
        customerProfileId: existingShipment.customerProfileId,
        details: {
          previousStatus: existingShipment.status,
        },
      });
    }

    return this.toGraphqlShipment(shipment);
  }

  async markMarketplaceEnRoutePickup(
    viewerProfileId: string,
    shipmentId: string,
  ): Promise<Shipment> {
    return this.updateProviderMarketplaceShipmentStatus(
      viewerProfileId,
      shipmentId,
      {
        allowedStatuses: [
          ShipmentStatus.ASSIGNED,
          ShipmentStatus.EN_ROUTE_PICKUP,
        ],
        nextStatus: ShipmentStatus.EN_ROUTE_PICKUP,
      },
    );
  }

  async confirmMarketplacePickup(
    viewerProfileId: string,
    shipmentId: string,
  ): Promise<Shipment> {
    return this.updateProviderMarketplaceShipmentStatus(
      viewerProfileId,
      shipmentId,
      {
        allowedStatuses: [
          ShipmentStatus.ASSIGNED,
          ShipmentStatus.EN_ROUTE_PICKUP,
          ShipmentStatus.PICKED_UP,
        ],
        nextStatus: ShipmentStatus.PICKED_UP,
      },
    );
  }

  async confirmMarketplaceDropoff(
    viewerProfileId: string,
    shipmentId: string,
  ): Promise<Shipment> {
    return this.updateProviderMarketplaceShipmentStatus(
      viewerProfileId,
      shipmentId,
      {
        allowedStatuses: [
          ShipmentStatus.PICKED_UP,
          ShipmentStatus.EN_ROUTE_DROPOFF,
          ShipmentStatus.DELIVERED,
          ShipmentStatus.COMPLETED,
        ],
        nextStatus: ShipmentStatus.COMPLETED,
        completeAssignment: true,
      },
    );
  }

  async cancelShipment(
    viewerProfileId: string,
    input: CancelShipmentDto,
  ): Promise<Shipment> {
    const viewerRole = await this.requireUserRole(viewerProfileId, [
      UserType.ADMIN,
      UserType.INDIVIDUAL,
    ]);
    const shipment = await this.prisma.shipment.findUnique({
      where: {
        id: input.shipmentId,
      },
      select: {
        id: true,
        customerProfileId: true,
        status: true,
      },
    });

    if (!shipment) {
      throw new NotFoundException(
        `Shipment with id ${input.shipmentId} not found`,
      );
    }

    const canMutate =
      viewerRole === UserType.ADMIN ||
      shipment.customerProfileId === viewerProfileId;
    if (!canMutate) {
      throw new ForbiddenException(
        'You are not allowed to cancel this shipment',
      );
    }

    if (
      !ShipmentsService.CANCELLABLE_STATUSES.includes(
        shipment.status as ShipmentStatus,
      )
    ) {
      throw new BadRequestException(
        `Shipment in ${shipment.status} status cannot be cancelled`,
      );
    }

    const cancelledShipment = await this.prisma.$transaction(async (tx) => {
      const updatedShipment = await tx.shipment.update({
        where: {
          id: input.shipmentId,
        },
        data: {
          status: ShipmentStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelledByProfileId: viewerProfileId,
          cancellationReason: input.cancellationReason.trim(),
        },
      });

      await tx.shipmentEvent.create({
        data: {
          shipmentId: updatedShipment.id,
          eventType: ShipmentEventType.CANCELLED,
          actorProfileId: viewerProfileId,
          actorRole:
            viewerRole === UserType.ADMIN
              ? ShipmentActorRole.ADMIN
              : ShipmentActorRole.CUSTOMER,
          metadata: {
            reason: input.cancellationReason.trim(),
          } as Prisma.InputJsonValue,
        },
      });

      return updatedShipment;
    });

    await this.notifyShipmentStatusChange({
      shipmentId: cancelledShipment.id,
      trackingCode: cancelledShipment.trackingCode,
      status: ShipmentStatus.CANCELLED,
      actorProfileId: viewerProfileId,
      customerProfileId: shipment.customerProfileId,
      details: {
        reason: input.cancellationReason.trim(),
      },
    });

    return this.toGraphqlShipment(cancelledShipment);
  }

  async addShipmentItem(
    viewerProfileId: string,
    input: AddShipmentItemDto,
  ): Promise<ShipmentItem> {
    const viewerRole = await this.requireUserRole(viewerProfileId, [
      UserType.ADMIN,
      UserType.INDIVIDUAL,
    ]);
    const shipment = await this.prisma.shipment.findUnique({
      where: {
        id: input.shipmentId,
      },
      select: {
        id: true,
        customerProfileId: true,
      },
    });

    if (!shipment) {
      throw new NotFoundException(
        `Shipment with id ${input.shipmentId} not found`,
      );
    }

    const canMutate =
      viewerRole === UserType.ADMIN ||
      shipment.customerProfileId === viewerProfileId;
    if (!canMutate) {
      throw new ForbiddenException(
        'You are not allowed to add shipment items for this shipment',
      );
    }

    const normalizedName = input.name.trim();
    if (!normalizedName) {
      throw new BadRequestException('Shipment item name is required');
    }

    const normalizedQuantity = Math.max(1, Math.round(Number(input.quantity)));
    if (!Number.isFinite(normalizedQuantity)) {
      throw new BadRequestException('Shipment item quantity is invalid');
    }

    const createdItem = await this.prisma.$transaction(async (tx) => {
      const item = await tx.shipmentItem.create({
        data: {
          shipmentId: input.shipmentId,
          name: normalizedName,
          quantity: normalizedQuantity,
          weightKg: input.weightKg ?? undefined,
        },
      });

      await tx.shipmentEvent.create({
        data: {
          shipmentId: input.shipmentId,
          eventType: ShipmentEventType.CREATED,
          actorProfileId: viewerProfileId,
          actorRole:
            viewerRole === UserType.ADMIN
              ? ShipmentActorRole.ADMIN
              : ShipmentActorRole.CUSTOMER,
          metadata: {
            action: 'add_shipment_item',
            itemId: item.id,
            name: item.name,
            quantity: item.quantity,
          } as Prisma.InputJsonValue,
        },
      });

      return item;
    });

    return this.toGraphqlShipmentItem(createdItem);
  }

  private async enqueueDispatchShipmentIfRequired(
    shipment: PrismaShipment,
  ): Promise<void> {
    if (shipment.mode !== ShipmentMode.DISPATCH) {
      return;
    }

    const now = new Date();
    const dispatchJob = this.buildDispatchShipmentJob(shipment, now);
    if (!dispatchJob) {
      return;
    }

    try {
      await this.dispatchQueue.add(
        DISPATCH_SHIPMENT_JOB,
        {
          shipmentId: shipment.id,
          trigger: dispatchJob.trigger,
        },
        {
          jobId: `${DISPATCH_SHIPMENT_JOB}:${shipment.id}:${dispatchJob.trigger}`,
          ...(dispatchJob.delayMs > 0 ? { delay: dispatchJob.delayMs } : {}),
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to enqueue dispatch job for shipment ${shipment.id}: ${message}`,
      );
    }
  }

  private buildDispatchShipmentJob(
    shipment: PrismaShipment,
    now: Date,
  ): { trigger: 'created' | 'scheduled'; delayMs: number } | null {
    if (
      shipment.scheduleType === ShipmentScheduleType.SCHEDULED &&
      shipment.scheduledAt
    ) {
      const delayMs = shipment.scheduledAt.getTime() - now.getTime();
      if (delayMs > 0) {
        return {
          trigger: 'scheduled',
          delayMs,
        };
      }
    }

    if (
      shipment.scheduleType === ShipmentScheduleType.INSTANT ||
      shipment.scheduleType === ShipmentScheduleType.SCHEDULED
    ) {
      return {
        trigger: 'created',
        delayMs: 0,
      };
    }

    return null;
  }

  private async resolveProviderIdForProfile(
    profileId: string,
  ): Promise<string | null> {
    const driverProfile = await this.prisma.driverProfile.findUnique({
      where: {
        profileId,
      },
      select: {
        providerId: true,
      },
    });

    if (driverProfile?.providerId) {
      return driverProfile.providerId;
    }

    const provider = await this.prisma.provider.findFirst({
      where: {
        profileId,
      },
      select: {
        id: true,
      },
    });

    if (provider?.id) {
      return provider.id;
    }

    const providerMember = await this.prisma.providerMember.findFirst({
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
    });

    return providerMember?.providerId ?? null;
  }

  private async requireOperationalProviderId(profileId: string): Promise<string> {
    await this.userService.assertDriverOnboardingComplete(profileId);

    const providerId = await this.resolveProviderIdForProfile(profileId);
    if (!providerId) {
      throw new ForbiddenException('No provider account found for this user');
    }

    return providerId;
  }

  private async requireUserRole(
    profileId: string,
    preferredRoles: UserType[] = [
      UserType.INDIVIDUAL,
      UserType.BUSINESS,
      UserType.ADMIN,
    ],
  ): Promise<UserType> {
    const profile = await this.prisma.profile.findUnique({
      where: {
        id: profileId,
      },
      select: {
        role: true,
        accountRole: true,
        activeAppMode: true,
        driverProfile: {
          select: {
            onboardingStatus: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return resolveProfileRole(profile, preferredRoles);
  }

  private async requireUserRoles(profileId: string): Promise<UserType[]> {
    const profile = await this.prisma.profile.findUnique({
      where: {
        id: profileId,
      },
      select: {
        role: true,
        accountRole: true,
        activeAppMode: true,
        driverProfile: {
          select: {
            onboardingStatus: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return normalizeProfileRoles(profile);
  }

  private async buildViewerShipmentWhereFilter(
    profileId: string,
    role: UserType,
  ): Promise<Prisma.ShipmentWhereInput | null> {
    if (role === UserType.ADMIN) {
      return {};
    }

    if (role === UserType.INDIVIDUAL) {
      return {
        customerProfileId: profileId,
      };
    }

    if (role === UserType.BUSINESS) {
      const providerId = await this.requireOperationalProviderId(profileId);

      return {
        OR: [
          {
            assignment: {
              is: {
                providerId,
              },
            },
          },
          {
            dispatchOffers: {
              some: {
                providerId,
              },
            },
          },
          {
            bids: {
              some: {
                providerId,
              },
            },
          },
        ],
      };
    }

    return null;
  }

  private async canAccessShipment(
    profileId: string,
    role: UserType,
    shipmentId: string,
    customerProfileId: string,
  ): Promise<boolean> {
    if (role === UserType.ADMIN) {
      return true;
    }

    if (role === UserType.INDIVIDUAL) {
      return customerProfileId === profileId;
    }

    if (role !== UserType.BUSINESS) {
      return false;
    }

    const providerId = await this.requireOperationalProviderId(profileId);

    const providerShipment = await this.prisma.shipment.findFirst({
      where: {
        id: shipmentId,
        OR: [
          {
            assignment: {
              is: {
                providerId,
              },
            },
          },
          {
            dispatchOffers: {
              some: {
                providerId,
              },
            },
          },
          {
            bids: {
              some: {
                providerId,
              },
            },
          },
        ],
      },
      select: {
        id: true,
      },
    });

    return Boolean(providerShipment);
  }

  private async canAccessShipmentForRoles(
    profileId: string,
    roles: UserType[],
    shipmentId: string,
    customerProfileId: string,
  ): Promise<boolean> {
    for (const role of roles) {
      const hasAccess = await this.canAccessShipment(
        profileId,
        role,
        shipmentId,
        customerProfileId,
      );

      if (hasAccess) {
        return true;
      }
    }

    return false;
  }

  private async assertViewerCanAccessShipment(
    viewerProfileId: string,
    shipmentId: string,
  ): Promise<void> {
    const viewerRoles = await this.requireUserRoles(viewerProfileId);

    const shipment = await this.prisma.shipment.findUnique({
      where: {
        id: shipmentId,
      },
      select: {
        id: true,
        customerProfileId: true,
      },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment with id ${shipmentId} not found`);
    }

    const hasAccess = await this.canAccessShipmentForRoles(
      viewerProfileId,
      viewerRoles,
      shipment.id,
      shipment.customerProfileId,
    );

    if (!hasAccess) {
      throw new ForbiddenException(
        'You are not allowed to access this shipment',
      );
    }
  }

  private async buildShipmentBasePriceEstimate(
    input: EstimateShipmentBasePriceDto,
    options: {
      allowedProfileId: string;
      allowAnyAddress: boolean;
    },
  ): Promise<ShipmentBasePriceEstimate> {
    const [pickup, dropoff, config] = await Promise.all([
      this.resolveEstimatePoint('pickup', {
        addressId: input.pickupAddressId,
        lat: input.pickupLat,
        lng: input.pickupLng,
        allowedProfileId: options.allowedProfileId,
        allowAnyAddress: options.allowAnyAddress,
      }),
      this.resolveEstimatePoint('dropoff', {
        addressId: input.dropoffAddressId,
        lat: input.dropoffLat,
        lng: input.dropoffLng,
        allowedProfileId: options.allowedProfileId,
        allowAnyAddress: options.allowAnyAddress,
      }),
      this.getShipmentBasePriceConfig(input.currency),
    ]);

    const distanceKm = this.calculateDistanceKm(
      pickup.lat,
      pickup.lng,
      dropoff.lat,
      dropoff.lng,
    );

    if (distanceKm === null) {
      throw new BadRequestException(
        'Pickup and dropoff coordinates are required to estimate base price.',
      );
    }

    const distanceFeeMinor = this.calculateDistanceFeeMinor(
      distanceKm,
      config.distancePerKmMinor,
    );
    const calculatedPriceMinor = config.baseFareMinor + distanceFeeMinor;
    const basePriceMinor =
      calculatedPriceMinor > config.minimumPriceMinor
        ? calculatedPriceMinor
        : config.minimumPriceMinor;

    return {
      currency: config.currency,
      distanceKm: Number(distanceKm.toFixed(2)),
      baseFareMinor: config.baseFareMinor,
      distanceFeeMinor,
      minimumPriceMinor: config.minimumPriceMinor,
      basePriceMinor,
    };
  }

  private async resolveEstimatePoint(
    label: 'pickup' | 'dropoff',
    input: {
      addressId?: string;
      lat?: number;
      lng?: number;
      allowedProfileId: string;
      allowAnyAddress: boolean;
    },
  ): Promise<{ lat: number; lng: number }> {
    if (input.addressId?.trim()) {
      const address = await this.prisma.userAddress.findUnique({
        where: {
          id: input.addressId.trim(),
        },
        select: {
          profileId: true,
          lat: true,
          lng: true,
        },
      });

      if (!address) {
        throw new NotFoundException(
          `${label} address ${input.addressId.trim()} was not found`,
        );
      }

      if (
        !input.allowAnyAddress &&
        address.profileId !== input.allowedProfileId
      ) {
        throw new ForbiddenException(
          `You cannot use that ${label} address for price estimation.`,
        );
      }

      if (address.lat == null || address.lng == null) {
        throw new BadRequestException(
          `${label} address does not have saved coordinates yet.`,
        );
      }

      return {
        lat: address.lat,
        lng: address.lng,
      };
    }

    if (input.lat == null || input.lng == null) {
      throw new BadRequestException(
        `Provide ${label} coordinates or a saved ${label} address.`,
      );
    }

    return {
      lat: input.lat,
      lng: input.lng,
    };
  }

  private async getShipmentBasePriceConfig(requestedCurrency?: string): Promise<{
    currency: string;
    baseFareMinor: bigint;
    distancePerKmMinor: bigint;
    minimumPriceMinor: bigint;
  }> {
    const configRows = await this.prisma.platformConfig.findMany({
      where: {
        key: {
          in: [
            'shipment_base_price_currency',
            'shipment_base_price_fixed_minor',
            'shipment_base_price_per_km_minor',
            'shipment_base_price_minimum_minor',
          ],
        },
      },
      select: {
        key: true,
        value: true,
      },
    });

    const configMap = new Map(
      configRows.map((row) => [row.key, row.value] as const),
    );

    const fallbackCurrency =
      requestedCurrency?.trim().toUpperCase() ||
      this.getAllowedShipmentCurrencies()[0] ||
      'NGN';

    return {
      currency:
        this.readConfigString(configMap.get('shipment_base_price_currency')) ??
        fallbackCurrency,
      baseFareMinor: this.readConfigBigInt(
        configMap.get('shipment_base_price_fixed_minor'),
        process.env.SHIPMENT_BASE_PRICE_FIXED_MINOR ?? '150000',
      ),
      distancePerKmMinor: this.readConfigBigInt(
        configMap.get('shipment_base_price_per_km_minor'),
        process.env.SHIPMENT_BASE_PRICE_PER_KM_MINOR ?? '35000',
      ),
      minimumPriceMinor: this.readConfigBigInt(
        configMap.get('shipment_base_price_minimum_minor'),
        process.env.SHIPMENT_BASE_PRICE_MINIMUM_MINOR ?? '250000',
      ),
    };
  }

  private readConfigString(value: unknown): string | null {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim().toUpperCase();
    }

    return null;
  }

  private readConfigBigInt(value: unknown, fallback: string): bigint {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return BigInt(Math.max(0, Math.floor(value)));
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      try {
        return BigInt(value.trim());
      } catch {
        return BigInt(fallback);
      }
    }

    return BigInt(fallback);
  }

  private calculateDistanceFeeMinor(
    distanceKm: number,
    distancePerKmMinor: bigint,
  ): bigint {
    const distanceMeters = BigInt(Math.max(0, Math.round(distanceKm * 1000)));
    return (distancePerKmMinor * distanceMeters + BigInt(999)) / BigInt(1000);
  }

  private calculateDistanceKm(
    originLat: number | null,
    originLng: number | null,
    destinationLat: number | null,
    destinationLng: number | null,
  ): number | null {
    if (
      originLat == null ||
      originLng == null ||
      destinationLat == null ||
      destinationLng == null
    ) {
      return null;
    }

    const toRadians = (value: number) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const deltaLat = toRadians(destinationLat - originLat);
    const deltaLng = toRadians(destinationLng - originLng);
    const a =
      Math.sin(deltaLat / 2) ** 2 +
      Math.cos(toRadians(originLat)) *
        Math.cos(toRadians(destinationLat)) *
        Math.sin(deltaLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
  }

  private async createInitialMilestones(
    tx: Prisma.TransactionClient,
    shipmentId: string,
  ): Promise<void> {
    const now = new Date();
    const milestoneTypes = [
      ShipmentMilestoneType.ACCEPTED,
      ShipmentMilestoneType.ARRIVED_PICKUP,
      ShipmentMilestoneType.PICKED_UP,
      ShipmentMilestoneType.ARRIVED_DROPOFF,
      ShipmentMilestoneType.DELIVERED,
      ShipmentMilestoneType.COMPLETED,
    ];

    await tx.shipmentMilestone.createMany({
      data: milestoneTypes.map((type) => ({
        shipmentId,
        type,
        status: ShipmentMilestoneStatus.PENDING,
        createdAt: now,
      })),
      skipDuplicates: true,
    });
  }

  private async markShipmentMilestoneReached(
    tx: Prisma.TransactionClient,
    shipmentId: string,
    milestoneType: ShipmentMilestoneType,
    status: ShipmentMilestoneStatus,
  ): Promise<void> {
    const existing = await tx.shipmentMilestone.findFirst({
      where: {
        shipmentId,
        type: milestoneType,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      await tx.shipmentMilestone.create({
        data: {
          shipmentId,
          type: milestoneType,
          status,
          occurredAt: new Date(),
        },
      });
      return;
    }

    await tx.shipmentMilestone.update({
      where: {
        id: existing.id,
      },
      data: {
        status,
        occurredAt: new Date(),
      },
    });
  }

  private async getOrCreateWalletAccount(
    profileId: string,
  ): Promise<WalletAccount | null> {
    const profile = await this.prisma.profile.findUnique({
      where: {
        id: profileId,
      },
      select: {
        id: true,
      },
    });

    if (!profile) {
      return null;
    }

    const wallet = await this.prisma.walletAccount.upsert({
      where: {
        ownerProfileId: profileId,
      },
      update: {},
      create: {
        ownerProfileId: profileId,
        currency: this.getAllowedShipmentCurrencies()[0] ?? 'NGN',
      },
    });

    return this.toGraphqlWalletAccount(wallet);
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

  private toGraphqlProviderKycStatus(status: {
    id: string;
    providerId: string;
    overallStatus: string;
    kycLevel: number;
    ninStatus: string;
    phoneStatus: string;
    faceStatus: string;
    ninVerifiedAt: Date | null;
    phoneVerifiedAt: Date | null;
    faceVerifiedAt: Date | null;
    faceConfidence: Prisma.Decimal | null;
    maskedNin: string | null;
    maskedPhone: string | null;
    failureSummary: string | null;
    lastVendorSyncAt: Date | null;
    lastCheckAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): ProviderKycStatus {
    return {
      id: status.id,
      providerId: status.providerId,
      overallStatus: status.overallStatus,
      kycLevel: status.kycLevel,
      ninStatus: status.ninStatus,
      phoneStatus: status.phoneStatus,
      faceStatus: status.faceStatus,
      ninVerifiedAt: status.ninVerifiedAt ?? undefined,
      phoneVerifiedAt: status.phoneVerifiedAt ?? undefined,
      faceVerifiedAt: status.faceVerifiedAt ?? undefined,
      faceConfidence: status.faceConfidence
        ? Number(status.faceConfidence)
        : undefined,
      maskedNin: status.maskedNin ?? undefined,
      maskedPhone: status.maskedPhone ?? undefined,
      failureSummary: status.failureSummary ?? undefined,
      lastVendorSyncAt: status.lastVendorSyncAt ?? undefined,
      lastCheckAt: status.lastCheckAt ?? undefined,
      createdAt: status.createdAt,
      updatedAt: status.updatedAt,
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

  private toGraphqlShipment(
    shipment: PrismaShipment & {
      items?: PrismaShipmentItem[];
      pickupAddress?: PrismaUserAddress | null;
      dropoffAddress?: PrismaUserAddress | null;
    },
  ): Shipment {
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
      items: shipment.items?.map((item) => this.toGraphqlShipmentItem(item)),
      pickupAddress: shipment.pickupAddress
        ? this.toGraphqlUserAddress(shipment.pickupAddress)
        : undefined,
      dropoffAddress: shipment.dropoffAddress
        ? this.toGraphqlUserAddress(shipment.dropoffAddress)
        : undefined,
    };
  }

  private toGraphqlUserAddress(address: PrismaUserAddress): UserAddress {
    return {
      id: address.id,
      profileId: address.profileId,
      address: address.address,
      city: address.city,
      state: address.state as State,
      postalCode: address.postalCode,
      label: address.label ?? undefined,
      countryCode: address.countryCode,
      lat: address.lat ?? undefined,
      lng: address.lng ?? undefined,
      isActive: false,
      createdAt: address.createdAt,
      updatedAt: address.updatedAt,
    };
  }

  private async updateProviderMarketplaceShipmentStatus(
    viewerProfileId: string,
    shipmentId: string,
    options: {
      allowedStatuses: ShipmentStatus[];
      nextStatus: ShipmentStatus;
      completeAssignment?: boolean;
    },
  ): Promise<Shipment> {
    const viewerRole = await this.requireUserRole(viewerProfileId, [
      UserType.BUSINESS,
      UserType.ADMIN,
    ]);
    const providerId =
      viewerRole === UserType.ADMIN
        ? await this.resolveProviderIdForProfile(viewerProfileId)
        : await this.requireOperationalProviderId(viewerProfileId);

    if (!providerId) {
      throw new ForbiddenException('No provider account found for this user');
    }

    const assignment = await this.requireProviderOwnedActiveAssignment(
      providerId,
      shipmentId,
    );
    const statusChanged = options.nextStatus !== assignment.shipment.status;
    const eventType = ShipmentsService.STATUS_TO_EVENT_TYPE[options.nextStatus];
    const milestoneType =
      ShipmentsService.STATUS_TO_MILESTONE[options.nextStatus];

    const result = await this.prisma.$transaction(async (tx) => {
      const currentShipment = await tx.shipment.findUnique({
        where: { id: shipmentId },
        select: {
          id: true,
          trackingCode: true,
          customerProfileId: true,
          status: true,
          mode: true,
        },
      });

      if (!currentShipment) {
        throw new NotFoundException(`Shipment with id ${shipmentId} not found`);
      }

      if (currentShipment.mode !== ShipmentMode.MARKETPLACE) {
        throw new BadRequestException('Shipment is not a marketplace request');
      }

      if (!options.allowedStatuses.includes(currentShipment.status)) {
        throw new BadRequestException(
          `Cannot update marketplace shipment from status ${currentShipment.status}`,
        );
      }

      if (options.completeAssignment) {
        await tx.shipmentAssignment.update({
          where: { id: assignment.id },
          data: {
            status: ShipmentAssignmentStatus.COMPLETED,
            completedAt: assignment.completedAt ?? new Date(),
          },
        });
      }

      const updatedShipment = await tx.shipment.update({
        where: { id: shipmentId },
        data: {
          status: options.nextStatus,
        },
        include: {
          items: true,
        },
      });

      if (statusChanged && eventType) {
        await tx.shipmentEvent.create({
          data: {
            shipmentId,
            eventType,
            actorProfileId: viewerProfileId,
            actorRole:
              viewerRole === UserType.ADMIN
                ? ShipmentActorRole.ADMIN
                : ShipmentActorRole.PROVIDER,
            metadata: {
              previousStatus: currentShipment.status,
              nextStatus: options.nextStatus,
            } as Prisma.InputJsonValue,
          },
        });
      }

      if (statusChanged && milestoneType) {
        await this.markShipmentMilestoneReached(
          tx,
          shipmentId,
          milestoneType,
          options.nextStatus === ShipmentStatus.COMPLETED
            ? ShipmentMilestoneStatus.VERIFIED
            : ShipmentMilestoneStatus.REACHED,
        );
      }

      return {
        shipment: updatedShipment,
        trackingCode: currentShipment.trackingCode,
        customerProfileId: currentShipment.customerProfileId,
        previousStatus: currentShipment.status,
      };
    });

    if (statusChanged) {
      await this.notifyShipmentStatusChange({
        shipmentId,
        trackingCode: result.trackingCode,
        status: options.nextStatus,
        actorProfileId: viewerProfileId,
        customerProfileId: result.customerProfileId,
        details: {
          previousStatus: result.previousStatus,
        },
      });
    }

    return this.toGraphqlShipment(result.shipment);
  }

  private async requireProviderOwnedActiveAssignment(
    providerId: string,
    shipmentId: string,
  ): Promise<
    PrismaShipmentAssignment & {
      shipment: Pick<PrismaShipment, 'status'>;
    }
  > {
    const assignment = await this.prisma.shipmentAssignment.findFirst({
      where: {
        shipmentId,
        providerId,
      },
      include: {
        shipment: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!assignment) {
      throw new ForbiddenException(
        'This shipment is not assigned to the authenticated provider',
      );
    }

    if (assignment.status !== ShipmentAssignmentStatus.ACTIVE) {
      throw new BadRequestException(
        `Shipment assignment is ${assignment.status} and cannot be updated`,
      );
    }

    return assignment;
  }

  private async notifyShipmentStatusChange(input: {
    shipmentId: string;
    trackingCode: string;
    status: ShipmentStatus;
    actorProfileId: string;
    customerProfileId: string;
    details?: Prisma.InputJsonValue;
  }): Promise<void> {
    const assignment = await this.prisma.shipmentAssignment.findUnique({
      where: {
        shipmentId: input.shipmentId,
      },
      select: {
        providerId: true,
      },
    });

    if (input.customerProfileId !== input.actorProfileId) {
      const customerAudience = await this.resolveNotificationAudience(
        input.customerProfileId,
      );
      await this.notifications.createNotification({
        recipientProfileId: input.customerProfileId,
        audience: customerAudience,
        category: NotificationCategory.SHIPMENT,
        title: `Shipment ${input.trackingCode} updated`,
        body: `Status changed to ${input.status}.`,
        entityType: 'shipment',
        entityId: input.shipmentId,
        metadata: input.details,
      });
    }

    if (assignment?.providerId) {
      await this.notifications.notifyProviderTeam(assignment.providerId, {
        category: NotificationCategory.SHIPMENT,
        title: `Shipment ${input.trackingCode} updated`,
        body: `Status changed to ${input.status}.`,
        entityType: 'shipment',
        entityId: input.shipmentId,
        metadata: input.details,
      });
    }

    await this.notifications.notifyAdmins({
      category: NotificationCategory.SHIPMENT,
      title: `Shipment ${input.trackingCode} updated`,
      body: `Status changed to ${input.status}.`,
      entityType: 'shipment',
      entityId: input.shipmentId,
      metadata: {
        actorProfileId: input.actorProfileId,
        ...((input.details as Record<string, unknown> | undefined) ?? {}),
      },
    });
  }

  private async resolveNotificationAudience(
    profileId: string,
  ): Promise<NotificationAudience> {
    const role = await this.requireUserRole(profileId, [
      UserType.ADMIN,
      UserType.BUSINESS,
      UserType.INDIVIDUAL,
    ]);

    if (role === UserType.ADMIN) {
      return NotificationAudience.ADMIN;
    }

    if (role === UserType.BUSINESS) {
      return NotificationAudience.PROVIDER;
    }

    return NotificationAudience.CUSTOMER;
  }

  private toGraphqlShipmentItem(item: PrismaShipmentItem): ShipmentItem {
    return {
      id: item.id,
      shipmentId: item.shipmentId,
      name: item.name,
      quantity: item.quantity,
      weightKg: item.weightKg ? Number(item.weightKg) : undefined,
      createdAt: item.createdAt,
    };
  }

  private toGraphqlShipmentEvent(event: PrismaShipmentEvent): ShipmentEvent {
    return {
      id: event.id,
      shipmentId: event.shipmentId,
      eventType: event.eventType as ShipmentEventType,
      actorProfileId: event.actorProfileId ?? undefined,
      actorRole: event.actorRole
        ? (event.actorRole as ShipmentActorRole)
        : undefined,
      metadata: event.metadata as Record<string, unknown> | undefined,
      createdAt: event.createdAt,
    };
  }

  private toGraphqlShipmentMilestone(
    milestone: PrismaShipmentMilestone,
  ): ShipmentMilestone {
    return {
      id: milestone.id,
      shipmentId: milestone.shipmentId,
      milestoneType: milestone.type as ShipmentMilestoneType,
      status: milestone.status as ShipmentMilestoneStatus,
      occurredAt: milestone.occurredAt ?? undefined,
      lat: milestone.lat ?? undefined,
      lng: milestone.lng ?? undefined,
      metadata: milestone.metadata as Record<string, unknown> | undefined,
      createdAt: milestone.createdAt,
    };
  }

  private getMonthStartUtc(date: Date): Date {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0),
    );
  }

  private toAddressSummary(
    address: {
      address: string;
      city: string;
    } | null,
  ): string | undefined {
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
