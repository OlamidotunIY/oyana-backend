import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  AddShipmentItemDto,
  CancelShipmentDto,
  CreateShipmentDto,
  KYCCase,
  KYCCaseStatus,
  ProviderDashboardQuary,
  Shipment,
  ShipmentActorRole,
  ShipmentDashboard,
  ShipmentEvent,
  ShipmentEventType,
  ShipmentItem,
  ShipmentMilestone,
  ShipmentMilestoneStatus,
  ShipmentMilestoneType,
  ShipmentQueryFilter,
  ShipmentScheduleType,
  ShipmentStatus,
  ShipmentTracking,
  UpdateShipmentDto,
  UserType,
  Vehicle,
  VehicleStatus,
  WalletAccount,
} from '../graphql';
import type {
  ShipmentEvent as PrismaShipmentEvent,
  ShipmentItem as PrismaShipmentItem,
  ShipmentMilestone as PrismaShipmentMilestone,
  Prisma,
  Shipment as PrismaShipment,
  Vehicle as PrismaVehicle,
} from '@prisma/client';

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

  async getShipmentsForViewer(
    viewerProfileId: string,
    filter?: ShipmentQueryFilter,
  ): Promise<Shipment[]> {
    const now = new Date();
    const viewerRole = await this.requireUserRole(viewerProfileId);
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

    const shipments = await this.prisma.runWithRetry(
      'ShipmentsService.getShipmentsForViewer',
      () =>
        this.prisma.shipment.findMany({
          where,
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

  async getShipmentByIdForViewer(
    viewerProfileId: string,
    id: string,
  ): Promise<Shipment | null> {
    const viewerRole = await this.requireUserRole(viewerProfileId);
    const shipment = await this.prisma.runWithRetry(
      'ShipmentsService.getShipmentByIdForViewer',
      () =>
        this.prisma.shipment.findUnique({
          where: { id },
          include: {
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
    );

    if (!shipment) {
      return null;
    }

    const hasAccess = await this.canAccessShipment(
      viewerProfileId,
      viewerRole,
      shipment.id,
      shipment.customerProfileId,
    );
    if (!hasAccess) {
      throw new ForbiddenException('You are not allowed to access this shipment');
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

    const events = await this.prisma.runWithRetry(
      'ShipmentsService.getShipmentTimelineForViewer.events',
      () =>
        this.prisma.shipmentEvent.findMany({
          where: {
            shipmentId,
          },
          orderBy: {
            createdAt: 'asc',
          },
        }),
    );

    return events.map((event) => this.toGraphqlShipmentEvent(event));
  }

  async getShipmentTrackingForViewer(
    viewerProfileId: string,
    shipmentId: string,
  ): Promise<ShipmentTracking> {
    await this.assertViewerCanAccessShipment(viewerProfileId, shipmentId);

    const shipment = await this.prisma.runWithRetry(
      'ShipmentsService.getShipmentTrackingForViewer.shipment',
      () =>
        this.prisma.shipment.findUnique({
          where: {
            id: shipmentId,
          },
          include: {
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
    );

    if (!shipment) {
      throw new NotFoundException(`Shipment with id ${shipmentId} not found`);
    }

    const [events, milestones] = await Promise.all([
      this.prisma.runWithRetry(
        'ShipmentsService.getShipmentTrackingForViewer.events',
        () =>
          this.prisma.shipmentEvent.findMany({
            where: {
              shipmentId,
            },
            orderBy: {
              createdAt: 'asc',
            },
          }),
      ),
      this.prisma.runWithRetry(
        'ShipmentsService.getShipmentTrackingForViewer.milestones',
        () =>
          this.prisma.shipmentMilestone.findMany({
            where: {
              shipmentId,
            },
            orderBy: {
              createdAt: 'asc',
            },
          }),
      ),
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
        vehicles: [],
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
      vehicles,
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
      this.prisma.runWithRetry(
        'ShipmentsService.getProviderDashboardQuary.vehicles',
        () =>
          this.prisma.vehicle.findMany({
            where: {
              providerId,
            },
            orderBy: {
              createdAt: 'desc',
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
      vehicles: vehicles.map((vehicle) => this.toGraphqlVehicle(vehicle)),
    };
  }

  async createShipment(input: CreateShipmentDto): Promise<Shipment> {
    const shipment = await this.prisma.runWithRetry(
      'ShipmentsService.createShipment',
      () =>
        this.prisma.$transaction(async (tx) => {
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
              pricingCurrency: input.pricingCurrency,
              quotedPriceMinor: input.quotedPriceMinor,
              finalPriceMinor: input.finalPriceMinor,
              commissionRateBps: this.defaultCommissionRateBps,
              commissionAmountMinor: 0,
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
        }),
    );

    return this.toGraphqlShipment(shipment);
  }

  async updateShipment(
    viewerProfileId: string,
    id: string,
    input: UpdateShipmentDto,
  ): Promise<Shipment> {
    const viewerRole = await this.requireUserRole(viewerProfileId);
    const existingShipment = await this.prisma.runWithRetry(
      'ShipmentsService.updateShipment.findUnique',
      () =>
        this.prisma.shipment.findUnique({
          where: { id },
          select: {
            id: true,
            commissionRateBps: true,
            customerProfileId: true,
            status: true,
          },
        }),
    );

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

    const shipment = await this.prisma.runWithRetry(
      'ShipmentsService.updateShipment',
      () =>
        this.prisma.$transaction(async (tx) => {
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
        }),
    );

    return this.toGraphqlShipment(shipment);
  }

  async cancelShipment(
    viewerProfileId: string,
    input: CancelShipmentDto,
  ): Promise<Shipment> {
    const viewerRole = await this.requireUserRole(viewerProfileId);
    const shipment = await this.prisma.runWithRetry(
      'ShipmentsService.cancelShipment.findShipment',
      () =>
        this.prisma.shipment.findUnique({
          where: {
            id: input.shipmentId,
          },
          select: {
            id: true,
            customerProfileId: true,
            status: true,
          },
        }),
    );

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

    if (!ShipmentsService.CANCELLABLE_STATUSES.includes(shipment.status as ShipmentStatus)) {
      throw new BadRequestException(
        `Shipment in ${shipment.status} status cannot be cancelled`,
      );
    }

    const cancelledShipment = await this.prisma.runWithRetry(
      'ShipmentsService.cancelShipment.update',
      () =>
        this.prisma.$transaction(async (tx) => {
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
        }),
    );

    return this.toGraphqlShipment(cancelledShipment);
  }

  async addShipmentItem(
    viewerProfileId: string,
    input: AddShipmentItemDto,
  ): Promise<ShipmentItem> {
    const viewerRole = await this.requireUserRole(viewerProfileId);
    const shipment = await this.prisma.runWithRetry(
      'ShipmentsService.addShipmentItem.shipment',
      () =>
        this.prisma.shipment.findUnique({
          where: {
            id: input.shipmentId,
          },
          select: {
            id: true,
            customerProfileId: true,
          },
        }),
    );

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

    const createdItem = await this.prisma.runWithRetry(
      'ShipmentsService.addShipmentItem.create',
      () =>
        this.prisma.$transaction(async (tx) => {
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
        }),
    );

    return this.toGraphqlShipmentItem(createdItem);
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

  private async requireUserRole(profileId: string): Promise<UserType> {
    const profile = await this.prisma.runWithRetry(
      'ShipmentsService.requireUserRole.profile',
      () =>
        this.prisma.profile.findUnique({
          where: {
            id: profileId,
          },
          select: {
            userType: true,
          },
        }),
    );

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return profile.userType as UserType;
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
      const providerId = await this.resolveProviderIdForProfile(profileId);
      if (!providerId) {
        return null;
      }

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

    const providerId = await this.resolveProviderIdForProfile(profileId);
    if (!providerId) {
      return false;
    }

    const providerShipment = await this.prisma.runWithRetry(
      'ShipmentsService.canAccessShipment.business',
      () =>
        this.prisma.shipment.findFirst({
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
        }),
    );

    return Boolean(providerShipment);
  }

  private async assertViewerCanAccessShipment(
    viewerProfileId: string,
    shipmentId: string,
  ): Promise<void> {
    const viewerRole = await this.requireUserRole(viewerProfileId);

    const shipment = await this.prisma.runWithRetry(
      'ShipmentsService.assertViewerCanAccessShipment.shipment',
      () =>
        this.prisma.shipment.findUnique({
          where: {
            id: shipmentId,
          },
          select: {
            id: true,
            customerProfileId: true,
          },
        }),
    );

    if (!shipment) {
      throw new NotFoundException(`Shipment with id ${shipmentId} not found`);
    }

    const hasAccess = await this.canAccessShipment(
      viewerProfileId,
      viewerRole,
      shipment.id,
      shipment.customerProfileId,
    );

    if (!hasAccess) {
      throw new ForbiddenException('You are not allowed to access this shipment');
    }
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

  private toGraphqlVehicle(vehicle: PrismaVehicle): Vehicle {
    const status =
      vehicle.status && Object.values(VehicleStatus).includes(vehicle.status as VehicleStatus)
        ? (vehicle.status as VehicleStatus)
        : VehicleStatus.ACTIVE;

    return {
      ...vehicle,
      plateNumber: vehicle.plateNumber ?? undefined,
      make: vehicle.make ?? undefined,
      model: vehicle.model ?? undefined,
      color: vehicle.color ?? undefined,
      capacityKg: vehicle.capacityKg ?? undefined,
      capacityVolumeCm3: vehicle.capacityVolumeCm3 ?? undefined,
      status,
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
