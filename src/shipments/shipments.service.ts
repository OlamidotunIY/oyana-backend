import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  CreateShipmentDto,
  Shipment,
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

  constructor(private readonly prisma: PrismaService) {}

  async getShipments(filter?: ShipmentQueryFilter): Promise<Shipment[]> {
    const now = new Date();
    const shipments = await this.prisma.runWithRetry('ShipmentsService.getShipments', () =>
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
            status: input.status ?? ShipmentStatus.CREATED,
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
            commissionAmountMinor: input.commissionAmountMinor,
          },
        }),
    );

    return this.toGraphqlShipment(shipment);
  }

  async updateShipment(id: string, input: UpdateShipmentDto): Promise<Shipment> {
    const existingShipment = await this.prisma.runWithRetry(
      'ShipmentsService.updateShipment.findUnique',
      () =>
        this.prisma.shipment.findUnique({
          where: { id },
          select: { id: true },
        }),
    );

    if (!existingShipment) {
      throw new NotFoundException(`Shipment with id ${id} not found`);
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
            commissionAmountMinor: input.commissionAmountMinor,
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
}
