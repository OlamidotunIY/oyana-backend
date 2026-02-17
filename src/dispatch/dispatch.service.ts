import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  DispatchBatch as PrismaDispatchBatch,
  DispatchOffer as PrismaDispatchOffer,
  Shipment as PrismaShipment,
  ShipmentAssignment as PrismaShipmentAssignment,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  AssignShipmentDto,
  CreateDispatchBatchDto,
  CreateDispatchOfferDto,
  DispatchBatch,
  DispatchBatchStatus,
  DispatchOffer,
  DispatchOfferStatus,
  Shipment,
  ShipmentAssignment,
  ShipmentAssignmentStatus,
  ShipmentStatus,
  UpdateDispatchOfferDto,
} from '../graphql';

@Injectable()
export class DispatchService {
  constructor(private readonly prisma: PrismaService) {}

  async dispatchBatches(): Promise<DispatchBatch[]> {
    const batches = await this.prisma.runWithRetry(
      'DispatchService.dispatchBatches',
      () =>
        this.prisma.dispatchBatch.findMany({
          orderBy: {
            createdAt: 'desc',
          },
        }),
    );

    return batches.map((batch) => this.toGraphqlDispatchBatch(batch));
  }

  async myDispatchOffers(profileId: string): Promise<DispatchOffer[]> {
    const providerId = await this.resolveProviderIdForProfile(profileId);

    if (!providerId) {
      return [];
    }

    const offers = await this.prisma.runWithRetry(
      'DispatchService.myDispatchOffers',
      () =>
        this.prisma.dispatchOffer.findMany({
          where: {
            providerId,
          },
          orderBy: [{ sentAt: 'desc' }, { createdAt: 'desc' }],
        }),
    );

    return offers.map((offer) => this.toGraphqlDispatchOffer(offer));
  }

  async createDispatchBatch(
    input: CreateDispatchBatchDto,
  ): Promise<DispatchBatch> {
    const batch = await this.prisma.runWithRetry(
      'DispatchService.createDispatchBatch',
      () =>
        this.prisma.dispatchBatch.create({
          data: {
            shipmentId: input.shipmentId,
            status: DispatchBatchStatus.OPEN,
            openedAt: new Date(),
            expiresAt: input.expiresAt,
          },
        }),
    );

    return this.toGraphqlDispatchBatch(batch);
  }

  async sendDispatchOffer(
    input: CreateDispatchOfferDto,
  ): Promise<DispatchOffer> {
    const offer = await this.prisma.runWithRetry(
      'DispatchService.sendDispatchOffer',
      () =>
        this.prisma.dispatchOffer.create({
          data: {
            batchId: input.batchId,
            providerId: input.providerId,
            shipmentId: input.shipmentId,
            vehicleId: input.vehicleId,
            status: DispatchOfferStatus.SENT,
            sentAt: new Date(),
            expiresAt: input.expiresAt,
            providerEtaMinutes: input.providerEtaMinutes,
            metadata: input.metadata,
          },
        }),
    );

    return this.toGraphqlDispatchOffer(offer);
  }

  async respondToDispatchOffer(
    profileId: string,
    input: UpdateDispatchOfferDto,
  ): Promise<DispatchOffer> {
    const providerId = await this.resolveProviderIdForProfile(profileId);

    if (!providerId) {
      throw new ForbiddenException('No provider account found for this user');
    }

    if (
      input.status !== DispatchOfferStatus.ACCEPTED &&
      input.status !== DispatchOfferStatus.DECLINED
    ) {
      throw new BadRequestException(
        'Only ACCEPTED or DECLINED statuses are allowed for this action',
      );
    }

    if (input.status === DispatchOfferStatus.DECLINED) {
      return this.declineDispatchOffer(providerId, input);
    }

    return this.acceptDispatchOffer(providerId, input);
  }

  async createShipmentAssignment(
    input: AssignShipmentDto,
  ): Promise<ShipmentAssignment> {
    const assignment = await this.prisma.runWithRetry(
      'DispatchService.createShipmentAssignment',
      () =>
        this.prisma.shipmentAssignment.create({
          data: {
            shipmentId: input.shipmentId,
            providerId: input.providerId,
            vehicleId: input.vehicleId,
            driverProfileId: input.driverProfileId,
            dispatchOfferId: input.dispatchOfferId,
            agreedPriceMinor: input.agreedPriceMinor,
            currency: input.currency,
            status: ShipmentAssignmentStatus.ACTIVE,
          },
        }),
    );

    return this.toGraphqlShipmentAssignment(assignment);
  }

  async updateShipmentAssignment(
    id: string,
    input: AssignShipmentDto,
  ): Promise<ShipmentAssignment> {
    const assignment = await this.prisma.runWithRetry(
      'DispatchService.updateShipmentAssignment',
      () =>
        this.prisma.shipmentAssignment.update({
          where: { id },
          data: {
            shipmentId: input.shipmentId,
            providerId: input.providerId,
            vehicleId: input.vehicleId,
            driverProfileId: input.driverProfileId,
            dispatchOfferId: input.dispatchOfferId,
            agreedPriceMinor: input.agreedPriceMinor,
            currency: input.currency,
          },
        }),
    );

    return this.toGraphqlShipmentAssignment(assignment);
  }

  async cancelShipmentAssignment(id: string): Promise<ShipmentAssignment> {
    const assignment = await this.prisma.runWithRetry(
      'DispatchService.cancelShipmentAssignment',
      () =>
        this.prisma.shipmentAssignment.update({
          where: { id },
          data: {
            status: ShipmentAssignmentStatus.CANCELLED,
            cancelledAt: new Date(),
          },
        }),
    );

    return this.toGraphqlShipmentAssignment(assignment);
  }

  async markEnRoutePickup(
    profileId: string,
    shipmentId: string,
  ): Promise<Shipment> {
    const providerId = await this.resolveProviderIdForProfile(profileId);

    if (!providerId) {
      throw new ForbiddenException('No provider account found for this user');
    }

    await this.requireProviderOwnedActiveAssignment(providerId, shipmentId);

    const shipment = await this.prisma.runWithRetry(
      'DispatchService.markEnRoutePickup.updateShipment',
      async () => {
        const currentShipment = await this.prisma.shipment.findUnique({
          where: { id: shipmentId },
        });

        if (!currentShipment) {
          throw new NotFoundException(`Shipment with id ${shipmentId} not found`);
        }

        const allowedStatuses = new Set<string>([
          ShipmentStatus.ASSIGNED,
          ShipmentStatus.EN_ROUTE_PICKUP,
        ]);

        if (!allowedStatuses.has(currentShipment.status)) {
          throw new BadRequestException(
            `Cannot mark pickup route from shipment status ${currentShipment.status}`,
          );
        }

        return this.prisma.shipment.update({
          where: { id: shipmentId },
          data: {
            status: ShipmentStatus.EN_ROUTE_PICKUP,
          },
        });
      },
    );

    return this.toGraphqlShipment(shipment);
  }

  async confirmPickup(profileId: string, shipmentId: string): Promise<Shipment> {
    const providerId = await this.resolveProviderIdForProfile(profileId);

    if (!providerId) {
      throw new ForbiddenException('No provider account found for this user');
    }

    await this.requireProviderOwnedActiveAssignment(providerId, shipmentId);

    const shipment = await this.prisma.runWithRetry(
      'DispatchService.confirmPickup.updateShipment',
      async () => {
        const currentShipment = await this.prisma.shipment.findUnique({
          where: { id: shipmentId },
        });

        if (!currentShipment) {
          throw new NotFoundException(`Shipment with id ${shipmentId} not found`);
        }

        const allowedStatuses = new Set<string>([
          ShipmentStatus.ASSIGNED,
          ShipmentStatus.EN_ROUTE_PICKUP,
          ShipmentStatus.PICKED_UP,
        ]);

        if (!allowedStatuses.has(currentShipment.status)) {
          throw new BadRequestException(
            `Cannot confirm pickup from shipment status ${currentShipment.status}`,
          );
        }

        return this.prisma.shipment.update({
          where: { id: shipmentId },
          data: {
            status: ShipmentStatus.PICKED_UP,
          },
        });
      },
    );

    return this.toGraphqlShipment(shipment);
  }

  async confirmDropoff(
    profileId: string,
    shipmentId: string,
  ): Promise<Shipment> {
    const providerId = await this.resolveProviderIdForProfile(profileId);

    if (!providerId) {
      throw new ForbiddenException('No provider account found for this user');
    }

    const assignment = await this.requireProviderOwnedActiveAssignment(
      providerId,
      shipmentId,
    );

    const now = new Date();

    const result = await this.prisma.runWithRetry(
      'DispatchService.confirmDropoff.transaction',
      () =>
        this.prisma.$transaction(async (tx) => {
          const currentShipment = await tx.shipment.findUnique({
            where: { id: shipmentId },
          });

          if (!currentShipment) {
            throw new NotFoundException(`Shipment with id ${shipmentId} not found`);
          }

          const allowedStatuses = new Set<string>([
            ShipmentStatus.PICKED_UP,
            ShipmentStatus.EN_ROUTE_DROPOFF,
            ShipmentStatus.DELIVERED,
            ShipmentStatus.COMPLETED,
          ]);

          if (!allowedStatuses.has(currentShipment.status)) {
            throw new BadRequestException(
              `Cannot confirm dropoff from shipment status ${currentShipment.status}`,
            );
          }

          await tx.shipmentAssignment.update({
            where: { id: assignment.id },
            data: {
              status: ShipmentAssignmentStatus.COMPLETED,
              completedAt: assignment.completedAt ?? now,
            },
          });

          return tx.shipment.update({
            where: { id: shipmentId },
            data: {
              status: ShipmentStatus.COMPLETED,
            },
          });
        }),
    );

    return this.toGraphqlShipment(result);
  }

  private async declineDispatchOffer(
    providerId: string,
    input: UpdateDispatchOfferDto,
  ): Promise<DispatchOffer> {
    const offer = await this.prisma.runWithRetry(
      'DispatchService.declineDispatchOffer.findOffer',
      () =>
        this.prisma.dispatchOffer.findFirst({
          where: {
            id: input.offerId,
            providerId,
          },
        }),
    );

    if (!offer) {
      throw new NotFoundException('Dispatch offer not found for this provider');
    }

    if (!this.canRespondToOffer(offer.status)) {
      throw new BadRequestException('Dispatch offer has already been responded to');
    }

    const updatedOffer = await this.prisma.runWithRetry(
      'DispatchService.declineDispatchOffer.updateOffer',
      () =>
        this.prisma.dispatchOffer.update({
          where: { id: offer.id },
          data: {
            status: DispatchOfferStatus.DECLINED,
            respondedAt: input.respondedAt ?? new Date(),
            providerEtaMinutes: input.providerEtaMinutes,
          },
        }),
    );

    return this.toGraphqlDispatchOffer(updatedOffer);
  }

  private async acceptDispatchOffer(
    providerId: string,
    input: UpdateDispatchOfferDto,
  ): Promise<DispatchOffer> {
    const now = new Date();

    const acceptedOffer = await this.prisma.runWithRetry(
      'DispatchService.acceptDispatchOffer.transaction',
      () =>
        this.prisma.$transaction(async (tx) => {
          const offer = await tx.dispatchOffer.findFirst({
            where: {
              id: input.offerId,
              providerId,
            },
          });

          if (!offer) {
            throw new NotFoundException(
              'Dispatch offer not found for this provider',
            );
          }

          if (!this.canRespondToOffer(offer.status)) {
            throw new BadRequestException(
              'Dispatch offer has already been responded to',
            );
          }

          const existingAssignment = await tx.shipmentAssignment.findUnique({
            where: {
              shipmentId: offer.shipmentId,
            },
          });

          if (existingAssignment) {
            if (existingAssignment.providerId !== providerId) {
              throw new BadRequestException(
                'Shipment is already assigned to another provider',
              );
            }

            if (existingAssignment.status !== ShipmentAssignmentStatus.ACTIVE) {
              throw new BadRequestException(
                `Shipment already has an assignment in ${existingAssignment.status} state`,
              );
            }
          }

          const updatedOffer = await tx.dispatchOffer.update({
            where: {
              id: offer.id,
            },
            data: {
              status: DispatchOfferStatus.ACCEPTED,
              respondedAt: input.respondedAt ?? now,
              providerEtaMinutes: input.providerEtaMinutes,
            },
          });

          if (!existingAssignment) {
            const shipment = await tx.shipment.findUnique({
              where: {
                id: offer.shipmentId,
              },
              select: {
                pricingCurrency: true,
                finalPriceMinor: true,
                quotedPriceMinor: true,
              },
            });

            if (!shipment) {
              throw new NotFoundException(
                `Shipment with id ${offer.shipmentId} not found`,
              );
            }

            await tx.shipmentAssignment.create({
              data: {
                shipmentId: offer.shipmentId,
                providerId,
                vehicleId: offer.vehicleId,
                dispatchOfferId: offer.id,
                status: ShipmentAssignmentStatus.ACTIVE,
                agreedPriceMinor:
                  shipment.finalPriceMinor ?? shipment.quotedPriceMinor,
                currency: shipment.pricingCurrency,
              },
            });
          }

          await tx.shipment.update({
            where: {
              id: offer.shipmentId,
            },
            data: {
              status: ShipmentStatus.ASSIGNED,
            },
          });

          await tx.dispatchOffer.updateMany({
            where: {
              shipmentId: offer.shipmentId,
              id: {
                not: offer.id,
              },
              status: {
                in: [DispatchOfferStatus.SENT, DispatchOfferStatus.VIEWED],
              },
            },
            data: {
              status: DispatchOfferStatus.CANCELLED,
            },
          });

          await tx.dispatchBatch.update({
            where: {
              id: offer.batchId,
            },
            data: {
              status: DispatchBatchStatus.ASSIGNED,
              closedAt: now,
            },
          });

          return updatedOffer;
        }),
    );

    return this.toGraphqlDispatchOffer(acceptedOffer);
  }

  private canRespondToOffer(status: string): boolean {
    return (
      status === DispatchOfferStatus.SENT || status === DispatchOfferStatus.VIEWED
    );
  }

  private async requireProviderOwnedActiveAssignment(
    providerId: string,
    shipmentId: string,
  ): Promise<PrismaShipmentAssignment> {
    const assignment = await this.prisma.runWithRetry(
      'DispatchService.requireProviderOwnedActiveAssignment',
      () =>
        this.prisma.shipmentAssignment.findFirst({
          where: {
            shipmentId,
            providerId,
          },
        }),
    );

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

  private async resolveProviderIdForProfile(
    profileId: string,
  ): Promise<string | null> {
    const provider = await this.prisma.runWithRetry(
      'DispatchService.resolveProviderIdForProfile.provider',
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
      'DispatchService.resolveProviderIdForProfile.providerMember',
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

  private toGraphqlDispatchBatch(batch: PrismaDispatchBatch): DispatchBatch {
    return {
      ...batch,
      openedAt: batch.openedAt ?? undefined,
      closedAt: batch.closedAt ?? undefined,
      expiresAt: batch.expiresAt ?? undefined,
    };
  }

  private toGraphqlDispatchOffer(offer: PrismaDispatchOffer): DispatchOffer {
    return {
      ...offer,
      vehicleId: offer.vehicleId ?? undefined,
      sentAt: offer.sentAt ?? undefined,
      respondedAt: offer.respondedAt ?? undefined,
      expiresAt: offer.expiresAt ?? undefined,
      providerEtaMinutes: offer.providerEtaMinutes ?? undefined,
      metadata: offer.metadata ?? undefined,
    };
  }

  private toGraphqlShipmentAssignment(
    assignment: PrismaShipmentAssignment,
  ): ShipmentAssignment {
    return {
      ...assignment,
      vehicleId: assignment.vehicleId ?? undefined,
      driverProfileId: assignment.driverProfileId ?? undefined,
      dispatchOfferId: assignment.dispatchOfferId ?? undefined,
      agreedPriceMinor: assignment.agreedPriceMinor ?? undefined,
      currency: assignment.currency ?? undefined,
      assignedAt: assignment.assignedAt ?? undefined,
      completedAt: assignment.completedAt ?? undefined,
      cancelledAt: assignment.cancelledAt ?? undefined,
      cancellationReason: assignment.cancellationReason ?? undefined,
    };
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
