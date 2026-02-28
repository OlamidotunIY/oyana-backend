import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type {
  DispatchBatch as PrismaDispatchBatch,
  DispatchOffer as PrismaDispatchOffer,
  Prisma,
  Shipment as PrismaShipment,
  ShipmentAssignment as PrismaShipmentAssignment,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import type { DispatchShipmentJobTrigger } from '../queue/queue.constants';
import {
  AssignShipmentDto,
  CreateDispatchBatchDto,
  CreateDispatchOfferDto,
  DispatchBatch,
  DispatchBatchStatus,
  DispatchOffer,
  DispatchOfferStatus,
  ShipmentActorRole,
  ShipmentEventType,
  ShipmentMode,
  ShipmentScheduleType,
  Shipment,
  ShipmentAssignment,
  ShipmentAssignmentStatus,
  ShipmentStatus,
  UpdateDispatchOfferDto,
  VehicleCategory,
} from '../graphql';

const DEFAULT_DISPATCH_WORKER_BATCH_SIZE = 100;
const DISPATCH_ACCEPT_CONFLICT_MESSAGE =
  'Dispatch offer can no longer be accepted because shipment is already assigned';

type EligibleDispatchProvider = {
  providerId: string;
  vehicleId: string;
};

@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);
  private readonly dispatchWorkerBatchSize: number;

  constructor(private readonly prisma: PrismaService) {
    this.dispatchWorkerBatchSize = this.parsePositiveInt(
      process.env.DISPATCH_WORKER_BATCH_SIZE,
      DEFAULT_DISPATCH_WORKER_BATCH_SIZE,
      1,
    );
  }

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

  async dispatchShipmentIfEligible(
    shipmentId: string,
    trigger: DispatchShipmentJobTrigger,
  ): Promise<boolean> {
    return this.prisma.runWithRetry(
      'DispatchService.dispatchShipmentIfEligible',
      async () =>
        this.prisma.$transaction(async (tx) => {
          const now = new Date();
          const shipment = await tx.shipment.findUnique({
            where: {
              id: shipmentId,
            },
            select: {
              id: true,
              mode: true,
              status: true,
              scheduleType: true,
              scheduledAt: true,
              vehicleCategory: true,
              dispatchBatch: {
                select: {
                  id: true,
                  status: true,
                },
              },
              assignment: {
                select: {
                  id: true,
                },
              },
            },
          });

          if (!shipment) {
            this.logger.warn(
              `Skipping dispatch job for missing shipment ${shipmentId}`,
            );
            return false;
          }

          if (shipment.mode !== ShipmentMode.DISPATCH) {
            return false;
          }

          if (shipment.status !== ShipmentStatus.CREATED) {
            return false;
          }

          if (!this.isShipmentDueForDispatch(shipment.scheduleType, shipment.scheduledAt, now)) {
            return false;
          }

          if (shipment.assignment?.id) {
            return false;
          }

          if (shipment.dispatchBatch?.status === DispatchBatchStatus.ASSIGNED) {
            return false;
          }

          const eligibleProviders = await this.findEligibleProviders(
            tx,
            shipment.vehicleCategory as VehicleCategory,
          );
          if (eligibleProviders.length === 0) {
            return false;
          }

          const batch = await this.getOrOpenDispatchBatch(tx, shipment.id, now);
          if (!batch || batch.status === DispatchBatchStatus.ASSIGNED) {
            return false;
          }

          await tx.dispatchOffer.createMany({
            data: eligibleProviders.map((provider) => ({
              batchId: batch.id,
              shipmentId: shipment.id,
              providerId: provider.providerId,
              vehicleId: provider.vehicleId,
              status: DispatchOfferStatus.SENT,
              sentAt: now,
              metadata: {
                trigger,
              },
            })),
            skipDuplicates: true,
          });

          await tx.shipment.update({
            where: {
              id: shipment.id,
            },
            data: {
              status: ShipmentStatus.BROADCASTING,
            },
          });

          const existingBroadcastEvent = await tx.shipmentEvent.findFirst({
            where: {
              shipmentId: shipment.id,
              eventType: ShipmentEventType.BROADCASTED,
            },
            select: {
              id: true,
            },
          });

          if (!existingBroadcastEvent) {
            await tx.shipmentEvent.create({
              data: {
                shipmentId: shipment.id,
                eventType: ShipmentEventType.BROADCASTED,
                actorRole: ShipmentActorRole.SYSTEM,
                metadata: {
                  trigger,
                  eligibleProviderCount: eligibleProviders.length,
                  dispatchBatchId: batch.id,
                },
              },
            });
          }

          return true;
        }),
    );
  }

  async dispatchDueShipments(): Promise<number> {
    const dueShipments = await this.prisma.runWithRetry(
      'DispatchService.dispatchDueShipments.findDueShipments',
      () =>
        this.prisma.shipment.findMany({
          where: this.buildDueShipmentWhere(),
          orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'asc' }],
          take: this.dispatchWorkerBatchSize,
          select: {
            id: true,
          },
        }),
    );

    let dispatchedCount = 0;
    for (const dueShipment of dueShipments) {
      const dispatched = await this.dispatchShipmentIfEligible(
        dueShipment.id,
        'reconcile',
      );
      if (dispatched) {
        dispatchedCount += 1;
      }
    }

    return dispatchedCount;
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
          const offerSeed = await tx.dispatchOffer.findFirst({
            where: {
              id: input.offerId,
              providerId,
            },
            select: {
              id: true,
              shipmentId: true,
            },
          });

          if (!offerSeed) {
            throw new NotFoundException(
              'Dispatch offer not found for this provider',
            );
          }

          await tx.$queryRaw`
            SELECT id
            FROM "shipments"
            WHERE id = ${offerSeed.shipmentId}::uuid
            FOR UPDATE
          `;

          const offer = await tx.dispatchOffer.findUnique({
            where: {
              id: offerSeed.id,
            },
          });

          if (!offer || offer.providerId !== providerId) {
            throw new NotFoundException(
              'Dispatch offer not found for this provider',
            );
          }

          if (offer.expiresAt && offer.expiresAt.getTime() <= now.getTime()) {
            throw new BadRequestException('Dispatch offer has expired');
          }

          const provider = await tx.provider.findUnique({
            where: {
              id: providerId,
            },
            select: {
              isAvailable: true,
            },
          });

          if (!provider?.isAvailable) {
            throw new ConflictException(
              'Provider is currently unavailable and cannot accept dispatch offers',
            );
          }

          const shipment = await tx.shipment.findUnique({
            where: {
              id: offer.shipmentId,
            },
            select: {
              id: true,
              status: true,
              vehicleCategory: true,
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

          if (
            shipment.status !== ShipmentStatus.CREATED &&
            shipment.status !== ShipmentStatus.BROADCASTING &&
            shipment.status !== ShipmentStatus.ASSIGNED
          ) {
            throw new BadRequestException(
              `Cannot accept dispatch offer from shipment status ${shipment.status}`,
            );
          }

          if (offer.vehicleId) {
            const vehicle = await tx.vehicle.findFirst({
              where: {
                id: offer.vehicleId,
                providerId,
                status: 'active',
                category: shipment.vehicleCategory,
              },
              select: {
                id: true,
              },
            });

            if (!vehicle) {
              throw new ConflictException(
                'Dispatch vehicle is no longer active for this shipment',
              );
            }
          } else {
            const fallbackVehicle = await tx.vehicle.findFirst({
              where: {
                providerId,
                status: 'active',
                category: shipment.vehicleCategory,
              },
              select: {
                id: true,
              },
              orderBy: {
                createdAt: 'asc',
              },
            });

            if (!fallbackVehicle) {
              throw new ConflictException(
                'No active vehicle is available for this dispatch category',
              );
            }
          }

          if (!this.canRespondToOffer(offer.status)) {
            const activeAssignment = await tx.shipmentAssignment.findUnique({
              where: {
                shipmentId: offer.shipmentId,
              },
            });

            if (
              offer.status === DispatchOfferStatus.ACCEPTED &&
              activeAssignment?.providerId === providerId &&
              activeAssignment.status === ShipmentAssignmentStatus.ACTIVE
            ) {
              return offer;
            }

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
            const isSameProviderActiveAssignment =
              existingAssignment.providerId === providerId &&
              existingAssignment.status === ShipmentAssignmentStatus.ACTIVE;

            if (!isSameProviderActiveAssignment) {
              throw new ConflictException(DISPATCH_ACCEPT_CONFLICT_MESSAGE);
            }
          }

          const acceptedUpdate = await tx.dispatchOffer.updateMany({
            where: {
              id: offer.id,
              status: {
                in: [DispatchOfferStatus.SENT, DispatchOfferStatus.VIEWED],
              },
            },
            data: {
              status: DispatchOfferStatus.ACCEPTED,
              respondedAt: input.respondedAt ?? now,
              providerEtaMinutes: input.providerEtaMinutes,
            },
          });

          if (acceptedUpdate.count === 0) {
            const refreshedOffer = await tx.dispatchOffer.findUnique({
              where: { id: offer.id },
            });

            if (refreshedOffer?.status === DispatchOfferStatus.ACCEPTED) {
              return refreshedOffer;
            }

            throw new ConflictException(DISPATCH_ACCEPT_CONFLICT_MESSAGE);
          }

          const updatedOffer = await tx.dispatchOffer.findUnique({
            where: {
              id: offer.id,
            },
          });

          if (!updatedOffer) {
            throw new NotFoundException('Dispatch offer no longer exists');
          }

          if (!existingAssignment) {
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

  private buildDueShipmentWhere() {
    const now = new Date();

    return {
      mode: ShipmentMode.DISPATCH,
      status: ShipmentStatus.CREATED,
      assignment: {
        is: null,
      },
      OR: [
        {
          dispatchBatch: {
            is: null,
          },
        },
        {
          dispatchBatch: {
            is: {
              status: {
                not: DispatchBatchStatus.ASSIGNED,
              },
            },
          },
        },
      ],
      AND: [
        {
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
        },
      ],
    };
  }

  private isShipmentDueForDispatch(
    scheduleType: string,
    scheduledAt: Date | null,
    now: Date,
  ): boolean {
    if (scheduleType === ShipmentScheduleType.INSTANT) {
      return true;
    }

    if (scheduleType !== ShipmentScheduleType.SCHEDULED) {
      return false;
    }

    if (!scheduledAt) {
      return true;
    }

    return scheduledAt.getTime() <= now.getTime();
  }

  private async getOrOpenDispatchBatch(
    tx: Prisma.TransactionClient,
    shipmentId: string,
    now: Date,
  ): Promise<PrismaDispatchBatch> {
    const existingBatch = await tx.dispatchBatch.findUnique({
      where: {
        shipmentId,
      },
    });

    if (!existingBatch) {
      return tx.dispatchBatch.create({
        data: {
          shipmentId,
          status: DispatchBatchStatus.OPEN,
          openedAt: now,
          closedAt: null,
        },
      });
    }

    if (existingBatch.status === DispatchBatchStatus.OPEN) {
      return existingBatch;
    }

    if (existingBatch.status === DispatchBatchStatus.ASSIGNED) {
      return existingBatch;
    }

    return tx.dispatchBatch.update({
      where: {
        id: existingBatch.id,
      },
      data: {
        status: DispatchBatchStatus.OPEN,
        openedAt: existingBatch.openedAt ?? now,
        closedAt: null,
      },
    });
  }

  private async findEligibleProviders(
    tx: Prisma.TransactionClient,
    vehicleCategory: VehicleCategory,
  ): Promise<EligibleDispatchProvider[]> {
    const providers = await tx.provider.findMany({
      where: {
        isAvailable: true,
        vehicles: {
          some: {
            category: vehicleCategory,
            status: 'active',
          },
        },
      },
      orderBy: [
        {
          priorityScore: 'desc',
        },
        {
          ratingAvg: 'desc',
        },
        {
          createdAt: 'asc',
        },
      ],
      select: {
        id: true,
        vehicles: {
          where: {
            category: vehicleCategory,
            status: 'active',
          },
          orderBy: {
            createdAt: 'asc',
          },
          take: 1,
          select: {
            id: true,
          },
        },
      },
    });

    const eligibleProviders: EligibleDispatchProvider[] = [];
    for (const provider of providers) {
      const vehicle = provider.vehicles[0];
      if (!vehicle?.id) {
        continue;
      }

      eligibleProviders.push({
        providerId: provider.id,
        vehicleId: vehicle.id,
      });
    }

    return eligibleProviders;
  }

  private parsePositiveInt(
    rawValue: string | undefined,
    fallback: number,
    minValue = 1,
  ): number {
    if (!rawValue) {
      return fallback;
    }

    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }

    const normalized = Math.floor(parsed);
    if (normalized < minValue) {
      return fallback;
    }

    return normalized;
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
