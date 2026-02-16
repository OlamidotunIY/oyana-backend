import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  CreateShipmentDto,
  Shipment,
  ShipmentDashboard,
  ShipmentQueryFilter,
  ShipmentScheduleType,
  ShipmentStatus,
  UpdateShipmentDto,
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
