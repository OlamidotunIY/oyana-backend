import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type {
  DispatchBatch as PrismaDispatchBatch,
  DispatchOffer as PrismaDispatchOffer,
  Prisma,
  Provider as PrismaProvider,
  Shipment as PrismaShipment,
  ShipmentAssignment as PrismaShipmentAssignment,
} from '@prisma/client';
import { PubSub } from 'graphql-subscriptions';
import { resolveProfileRole } from '../auth/utils/roles.util';
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
  Provider,
  RespondToShipmentDispatchOfferDto,
  UpdateDispatchOfferDto,
  UserType,
  VehicleCategory,
  NotificationCategory,
} from '../graphql';
import { NotificationsService } from '../notifications/notifications.service';
import { UserService } from '../user/user.service';

export const DISPATCH_PUBSUB = 'DISPATCH_PUBSUB';

const DEFAULT_DISPATCH_WORKER_BATCH_SIZE = 100;
const DEFAULT_DISPATCH_RECONCILE_DB_MAX_RETRIES = 4;
const DEFAULT_DISPATCH_RECONCILE_DB_BASE_DELAY_MS = 500;
const DEFAULT_DISPATCH_MAX_RADIUS_KM = 50;
const DEFAULT_DISPATCH_ROUTE_ALIGN_KM = 5;
const DEFAULT_DRIVER_HEARTBEAT_STALE_MS = 5 * 60 * 1000;
const DISPATCH_ACCEPT_CONFLICT_MESSAGE =
  'Dispatch offer can no longer be accepted because shipment is already assigned';

type EligibleDispatchProvider = {
  providerId: string;
};

type DbRetryOptions = {
  maxRetries?: number;
  baseDelayMs?: number;
};

@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);
  private readonly dispatchWorkerBatchSize: number;
  private readonly dispatchReconcileDbRetryOptions: DbRetryOptions;
  private readonly dispatchMaxRadiusKm: number;
  private readonly dispatchRouteAlignKm: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly userService: UserService,
    @Inject(DISPATCH_PUBSUB) private readonly pubSub: PubSub,
  ) {
    this.dispatchWorkerBatchSize = this.parsePositiveInt(
      process.env.DISPATCH_WORKER_BATCH_SIZE,
      DEFAULT_DISPATCH_WORKER_BATCH_SIZE,
      1,
    );
    this.dispatchMaxRadiusKm = this.parsePositiveInt(
      process.env.DISPATCH_MAX_RADIUS_KM,
      DEFAULT_DISPATCH_MAX_RADIUS_KM,
      1,
    );
    this.dispatchRouteAlignKm = this.parsePositiveInt(
      process.env.DISPATCH_ROUTE_ALIGN_KM,
      DEFAULT_DISPATCH_ROUTE_ALIGN_KM,
      1,
    );
    this.dispatchReconcileDbRetryOptions = {
      maxRetries: this.parsePositiveInt(
        process.env.DISPATCH_RECONCILE_DB_MAX_RETRIES,
        DEFAULT_DISPATCH_RECONCILE_DB_MAX_RETRIES,
        0,
      ),
      baseDelayMs: this.parsePositiveInt(
        process.env.DISPATCH_RECONCILE_DB_BASE_DELAY_MS,
        DEFAULT_DISPATCH_RECONCILE_DB_BASE_DELAY_MS,
        1,
      ),
    };
  }

  async dispatchBatches(): Promise<DispatchBatch[]> {
    const batches = await this.prisma.dispatchBatch.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return batches.map((batch) => this.toGraphqlDispatchBatch(batch));
  }

  async myDispatchOffers(profileId: string): Promise<DispatchOffer[]> {
    const providerId = await this.requireOperationalProviderId(profileId);

    const offers = await this.prisma.dispatchOffer.findMany({
      where: {
        providerId,
      },
      orderBy: [{ sentAt: 'desc' }, { createdAt: 'desc' }],
    });

    return offers.map((offer) => this.toGraphqlDispatchOffer(offer));
  }

  async shipmentDispatchOffers(
    profileId: string,
    shipmentId: string,
  ): Promise<DispatchOffer[]> {
    const role = await this.requireUserRole(profileId, [
      UserType.ADMIN,
      UserType.INDIVIDUAL,
    ]);

    const shipment = await this.prisma.shipment.findUnique({
      where: {
        id: shipmentId,
      },
      select: {
        id: true,
        customerProfileId: true,
        mode: true,
      },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment with id ${shipmentId} not found`);
    }

    if (shipment.mode !== ShipmentMode.DISPATCH) {
      throw new BadRequestException('Shipment is not a dispatch request');
    }

    if (role !== UserType.ADMIN && shipment.customerProfileId !== profileId) {
      throw new ForbiddenException(
        'Only the shipment owner can view dispatch offers',
      );
    }

    const offers = await this.prisma.dispatchOffer.findMany({
      where: {
        shipmentId,
      },
      include: {
        provider: true,
      },
      orderBy: [{ counteredAt: 'desc' }, { respondedAt: 'desc' }, { sentAt: 'desc' }],
    });

    return offers.map((offer) =>
      this.toGraphqlDispatchOffer(offer, {
        provider: offer.provider
          ? this.toGraphqlProvider(offer.provider)
          : undefined,
      }),
    );
  }

  async dispatchShipmentIfEligible(
    shipmentId: string,
    trigger: DispatchShipmentJobTrigger,
    retryOptions?: DbRetryOptions,
  ): Promise<boolean> {
    let notificationContext:
      | {
          shipmentId: string;
          trackingCode: string;
          customerProfileId: string;
          providerIds: string[];
        }
      | undefined;

    const dispatched = await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const shipment = await tx.shipment.findUnique({
        where: {
          id: shipmentId,
        },
        select: {
          id: true,
          trackingCode: true,
          customerProfileId: true,
          mode: true,
          status: true,
          scheduleType: true,
          scheduledAt: true,
          vehicleCategory: true,
          pickupAddress: {
            select: {
              lat: true,
              lng: true,
            },
          },
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

      if (
        !this.isShipmentDueForDispatch(
          shipment.scheduleType,
          shipment.scheduledAt,
          now,
        )
      ) {
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
        shipment.pickupAddress?.lat ?? null,
        shipment.pickupAddress?.lng ?? null,
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

      notificationContext = {
        shipmentId: shipment.id,
        trackingCode: shipment.trackingCode,
        customerProfileId: shipment.customerProfileId,
        providerIds: eligibleProviders.map((provider) => provider.providerId),
      };

      return true;
    });

    if (dispatched && notificationContext) {
      await this.notifications.notifyCustomer(
        notificationContext.customerProfileId,
        {
          category: NotificationCategory.DISPATCH,
          title: `Shipment ${notificationContext.trackingCode} is broadcasting`,
          body: 'We are matching your shipment with available providers.',
          entityType: 'shipment',
          entityId: notificationContext.shipmentId,
        },
      );

      await this.notifications.notifyAdmins({
        category: NotificationCategory.DISPATCH,
        title: `Dispatch started for ${notificationContext.trackingCode}`,
        body: `Offers sent to ${notificationContext.providerIds.length} provider(s).`,
        entityType: 'shipment',
        entityId: notificationContext.shipmentId,
      });

      const providerIds = new Set(notificationContext.providerIds);
      for (const providerId of providerIds) {
        await this.notifications.notifyProviderTeam(providerId, {
          category: NotificationCategory.DISPATCH,
          title: 'New dispatch offer available',
          body: `Shipment ${notificationContext.trackingCode} is ready for response.`,
          entityType: 'shipment',
          entityId: notificationContext.shipmentId,
        });
      }

      // Real-time subscription: push offers to subscribed providers via WebSocket
      const sentOffers = await this.prisma.dispatchOffer.findMany({
        where: {
          shipmentId: notificationContext.shipmentId,
          providerId: { in: [...providerIds] },
          status: DispatchOfferStatus.SENT,
        },
      });
      for (const offer of sentOffers) {
        await this.pubSub.publish(`DISPATCH_OFFER_SENT.${offer.providerId}`, {
          dispatchOfferSent: this.toGraphqlDispatchOffer(offer),
        });
      }
    }

    return dispatched;
  }

  async dispatchDueShipments(): Promise<number> {
    const dueShipments = await this.prisma.shipment.findMany({
      where: this.buildDueShipmentWhere(),
      orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'asc' }],
      take: this.dispatchWorkerBatchSize,
      select: {
        id: true,
      },
    });

    let dispatchedCount = 0;
    for (const dueShipment of dueShipments) {
      const dispatched = await this.dispatchShipmentIfEligible(
        dueShipment.id,
        'reconcile',
        this.dispatchReconcileDbRetryOptions,
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
    const batch = await this.prisma.dispatchBatch.create({
      data: {
        shipmentId: input.shipmentId,
        status: DispatchBatchStatus.OPEN,
        openedAt: new Date(),
        expiresAt: input.expiresAt,
      },
    });

    return this.toGraphqlDispatchBatch(batch);
  }

  async sendDispatchOffer(
    input: CreateDispatchOfferDto,
  ): Promise<DispatchOffer> {
    const offer = await this.prisma.dispatchOffer.create({
      data: {
        batchId: input.batchId,
        providerId: input.providerId,
        shipmentId: input.shipmentId,
        status: DispatchOfferStatus.SENT,
        sentAt: new Date(),
        expiresAt: input.expiresAt,
        providerEtaMinutes: input.providerEtaMinutes,
        metadata: input.metadata,
      },
    });

    return this.toGraphqlDispatchOffer(offer);
  }

  async respondToDispatchOffer(
    profileId: string,
    input: UpdateDispatchOfferDto,
  ): Promise<DispatchOffer> {
    const providerId = await this.requireOperationalProviderId(profileId);

    if (
      input.status !== DispatchOfferStatus.ACCEPTED &&
      input.status !== DispatchOfferStatus.DECLINED &&
      input.status !== DispatchOfferStatus.COUNTERED
    ) {
      throw new BadRequestException(
        'Only ACCEPTED, DECLINED, or COUNTERED statuses are allowed for this action',
      );
    }

    if (input.status === DispatchOfferStatus.DECLINED) {
      return this.declineDispatchOffer(providerId, input);
    }

    if (input.status === DispatchOfferStatus.COUNTERED) {
      return this.counterDispatchOffer(providerId, input);
    }

    return this.acceptDispatchOffer(providerId, input);
  }

  async respondToShipmentDispatchOffer(
    profileId: string,
    input: RespondToShipmentDispatchOfferDto,
  ): Promise<DispatchOffer> {
    if (
      input.status !== DispatchOfferStatus.ACCEPTED &&
      input.status !== DispatchOfferStatus.DECLINED
    ) {
      throw new BadRequestException(
        'Only ACCEPTED or DECLINED statuses are allowed for shipper dispatch review',
      );
    }

    if (input.status === DispatchOfferStatus.DECLINED) {
      return this.declineShipmentDispatchOffer(profileId, input);
    }

    return this.acceptShipmentDispatchOffer(profileId, input);
  }

  async createShipmentAssignment(
    input: AssignShipmentDto,
  ): Promise<ShipmentAssignment> {
    const assignment = await this.prisma.shipmentAssignment.create({
      data: {
        shipmentId: input.shipmentId,
        providerId: input.providerId,
        driverProfileId: input.driverProfileId,
        dispatchOfferId: input.dispatchOfferId,
        agreedPriceMinor: input.agreedPriceMinor,
        currency: input.currency,
        status: ShipmentAssignmentStatus.ACTIVE,
      },
    });

    return this.toGraphqlShipmentAssignment(assignment);
  }

  async updateShipmentAssignment(
    id: string,
    input: AssignShipmentDto,
  ): Promise<ShipmentAssignment> {
    const assignment = await this.prisma.shipmentAssignment.update({
      where: { id },
      data: {
        shipmentId: input.shipmentId,
        providerId: input.providerId,
        driverProfileId: input.driverProfileId,
        dispatchOfferId: input.dispatchOfferId,
        agreedPriceMinor: input.agreedPriceMinor,
        currency: input.currency,
      },
    });

    return this.toGraphqlShipmentAssignment(assignment);
  }

  async cancelShipmentAssignment(id: string): Promise<ShipmentAssignment> {
    const assignment = await this.prisma.shipmentAssignment.update({
      where: { id },
      data: {
        status: ShipmentAssignmentStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });

    return this.toGraphqlShipmentAssignment(assignment);
  }

  async markEnRoutePickup(
    profileId: string,
    shipmentId: string,
  ): Promise<Shipment> {
    const providerId = await this.requireOperationalProviderId(profileId);

    await this.requireProviderOwnedActiveAssignment(providerId, shipmentId);

    const shipment = await (async () => {
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
    })();

    await this.notifyShipmentProgress(
      shipment.id,
      shipment.trackingCode,
      shipment.customerProfileId,
      providerId,
      NotificationCategory.DISPATCH,
      'Driver is en route to pickup',
      `Shipment ${shipment.trackingCode} is now en route for pickup.`,
    );

    return this.toGraphqlShipment(shipment);
  }

  async confirmPickup(
    profileId: string,
    shipmentId: string,
  ): Promise<Shipment> {
    const providerId = await this.requireOperationalProviderId(profileId);

    await this.requireProviderOwnedActiveAssignment(providerId, shipmentId);

    const shipment = await (async () => {
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
    })();

    await this.notifyShipmentProgress(
      shipment.id,
      shipment.trackingCode,
      shipment.customerProfileId,
      providerId,
      NotificationCategory.DISPATCH,
      'Shipment picked up',
      `Shipment ${shipment.trackingCode} has been picked up.`,
    );

    return this.toGraphqlShipment(shipment);
  }

  async confirmDropoff(
    profileId: string,
    shipmentId: string,
  ): Promise<Shipment> {
    const providerId = await this.requireOperationalProviderId(profileId);

    const assignment = await this.requireProviderOwnedActiveAssignment(
      providerId,
      shipmentId,
    );

    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
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
    });

    await this.notifyShipmentProgress(
      result.id,
      result.trackingCode,
      result.customerProfileId,
      providerId,
      NotificationCategory.DISPATCH,
      'Shipment completed',
      `Shipment ${result.trackingCode} has been completed.`,
    );

    return this.toGraphqlShipment(result);
  }

  private async declineDispatchOffer(
    providerId: string,
    input: UpdateDispatchOfferDto,
  ): Promise<DispatchOffer> {
    const offer = await this.prisma.dispatchOffer.findFirst({
      where: {
        id: input.offerId,
        providerId,
      },
    });

    if (!offer) {
      throw new NotFoundException('Dispatch offer not found for this provider');
    }

    if (!this.canRespondToOffer(offer.status)) {
      throw new BadRequestException(
        'Dispatch offer has already been responded to',
      );
    }

    const updatedOffer = await this.prisma.dispatchOffer.update({
      where: { id: offer.id },
      data: {
        status: DispatchOfferStatus.DECLINED,
        respondedAt: input.respondedAt ?? new Date(),
        providerEtaMinutes: input.providerEtaMinutes,
      },
    });

    const shipment = await this.prisma.shipment.findUnique({
      where: {
        id: updatedOffer.shipmentId,
      },
      select: {
        trackingCode: true,
        customerProfileId: true,
      },
    });

    if (shipment) {
      await this.notifications.notifyCustomer(shipment.customerProfileId, {
        category: NotificationCategory.DISPATCH,
        title: `Provider declined ${shipment.trackingCode}`,
        body: 'A provider declined this dispatch offer. We are still matching.',
        entityType: 'shipment',
        entityId: updatedOffer.shipmentId,
      });
    }

    await this.notifications.notifyProviderTeam(providerId, {
      category: NotificationCategory.DISPATCH,
      title: 'Dispatch offer declined',
      body: shipment
        ? `You declined shipment ${shipment.trackingCode}.`
        : 'A dispatch offer was declined.',
      entityType: 'dispatch_offer',
      entityId: updatedOffer.id,
    });

    await this.notifications.notifyAdmins({
      category: NotificationCategory.DISPATCH,
      title: 'Dispatch offer declined',
      body: shipment
        ? `Provider declined shipment ${shipment.trackingCode}.`
        : 'A dispatch offer was declined.',
      entityType: 'dispatch_offer',
      entityId: updatedOffer.id,
      metadata: {
        providerId,
      },
    });

    return this.toGraphqlDispatchOffer(updatedOffer);
  }

  private async counterDispatchOffer(
    providerId: string,
    input: UpdateDispatchOfferDto,
  ): Promise<DispatchOffer> {
    const offer = await this.prisma.dispatchOffer.findFirst({
      where: {
        id: input.offerId,
        providerId,
      },
    });

    if (!offer) {
      throw new NotFoundException('Dispatch offer not found for this provider');
    }

    if (!this.canRespondToOffer(offer.status)) {
      throw new BadRequestException(
        'Dispatch offer has already been responded to',
      );
    }

    if (offer.expiresAt && offer.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Dispatch offer has expired');
    }

    if (input.counterAmountMinor == null) {
      throw new BadRequestException(
        'Counter amount is required when submitting a counter offer',
      );
    }

    const counterAmountMinor = BigInt(input.counterAmountMinor);
    if (counterAmountMinor <= BigInt(0)) {
      throw new BadRequestException('Counter amount must be greater than 0');
    }

    const shipment = await this.prisma.shipment.findUnique({
      where: {
        id: offer.shipmentId,
      },
      select: {
        id: true,
        trackingCode: true,
        customerProfileId: true,
        status: true,
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
      shipment.status !== ShipmentStatus.BROADCASTING
    ) {
      throw new BadRequestException(
        `Cannot counter dispatch offer from shipment status ${shipment.status}`,
      );
    }

    const currentPriceMinor =
      shipment.finalPriceMinor ?? shipment.quotedPriceMinor ?? null;
    if (currentPriceMinor != null && counterAmountMinor <= currentPriceMinor) {
      throw new BadRequestException(
        'Counter amount must be higher than the current shipment price',
      );
    }

    const counterCurrency = (
      input.counterCurrency ?? shipment.pricingCurrency
    )?.toUpperCase();

    if (!counterCurrency) {
      throw new BadRequestException(
        'Counter currency is required for a counter offer',
      );
    }

    if (
      shipment.pricingCurrency &&
      counterCurrency !== shipment.pricingCurrency.toUpperCase()
    ) {
      throw new BadRequestException(
        'Counter offers must use the shipment pricing currency',
      );
    }

    const now = input.respondedAt ?? new Date();
    const updatedOffer = await this.prisma.dispatchOffer.update({
      where: { id: offer.id },
      data: {
        status: DispatchOfferStatus.COUNTERED,
        respondedAt: now,
        providerEtaMinutes: input.providerEtaMinutes,
        counterAmountMinor,
        counterCurrency,
        counterMessage: input.counterMessage?.trim() || undefined,
        counteredAt: now,
      },
    });

    await this.notifications.notifyCustomer(shipment.customerProfileId, {
      category: NotificationCategory.DISPATCH,
      title: `Counter offer on ${shipment.trackingCode}`,
      body: 'A driver submitted a higher price for this dispatch request.',
      entityType: 'shipment',
      entityId: shipment.id,
      metadata: {
        providerId,
        offerId: updatedOffer.id,
        counterAmountMinor: counterAmountMinor.toString(),
        counterCurrency,
      },
    });

    await this.notifications.notifyProviderTeam(providerId, {
      category: NotificationCategory.DISPATCH,
      title: 'Counter offer submitted',
      body: `You submitted a higher price for shipment ${shipment.trackingCode}.`,
      entityType: 'dispatch_offer',
      entityId: updatedOffer.id,
    });

    await this.notifications.notifyAdmins({
      category: NotificationCategory.DISPATCH,
      title: 'Dispatch counter offer submitted',
      body: `Provider submitted a counter offer for shipment ${shipment.trackingCode}.`,
      entityType: 'dispatch_offer',
      entityId: updatedOffer.id,
      metadata: {
        providerId,
        shipmentId: shipment.id,
        counterAmountMinor: counterAmountMinor.toString(),
        counterCurrency,
      },
    });

    return this.toGraphqlDispatchOffer(updatedOffer);
  }

  private async declineShipmentDispatchOffer(
    profileId: string,
    input: RespondToShipmentDispatchOfferDto,
  ): Promise<DispatchOffer> {
    const role = await this.requireUserRole(profileId, [
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
        trackingCode: true,
        mode: true,
      },
    });

    if (!shipment) {
      throw new NotFoundException(
        `Shipment with id ${input.shipmentId} not found`,
      );
    }

    if (shipment.mode !== ShipmentMode.DISPATCH) {
      throw new BadRequestException('Shipment is not a dispatch request');
    }

    if (role !== UserType.ADMIN && shipment.customerProfileId !== profileId) {
      throw new ForbiddenException(
        'Only the shipment owner can review dispatch counters',
      );
    }

    const offer = await this.prisma.dispatchOffer.findFirst({
      where: {
        id: input.offerId,
        shipmentId: input.shipmentId,
      },
    });

    if (!offer) {
      throw new NotFoundException('Dispatch offer not found for this shipment');
    }

    if (offer.status === DispatchOfferStatus.DECLINED) {
      return this.toGraphqlDispatchOffer(offer);
    }

    if (!this.canOwnerRespondToCounterOffer(offer.status)) {
      throw new BadRequestException(
        'Only pending counter offers can be declined by the shipper',
      );
    }

    const updatedOffer = await this.prisma.dispatchOffer.update({
      where: { id: offer.id },
      data: {
        status: DispatchOfferStatus.DECLINED,
        respondedAt: input.respondedAt ?? new Date(),
      },
    });

    await this.notifications.notifyCustomer(shipment.customerProfileId, {
      category: NotificationCategory.DISPATCH,
      title: `Counter offer declined for ${shipment.trackingCode}`,
      body: 'You declined the driver counter offer.',
      entityType: 'dispatch_offer',
      entityId: updatedOffer.id,
    });

    await this.notifications.notifyProviderTeam(offer.providerId, {
      category: NotificationCategory.DISPATCH,
      title: 'Counter offer declined',
      body: `Your counter offer for shipment ${shipment.trackingCode} was declined.`,
      entityType: 'dispatch_offer',
      entityId: updatedOffer.id,
    });

    await this.notifications.notifyAdmins({
      category: NotificationCategory.DISPATCH,
      title: 'Dispatch counter declined',
      body: `Shipper declined the counter offer for shipment ${shipment.trackingCode}.`,
      entityType: 'dispatch_offer',
      entityId: updatedOffer.id,
      metadata: {
        shipmentId: shipment.id,
        providerId: offer.providerId,
      },
    });

    return this.toGraphqlDispatchOffer(updatedOffer);
  }

  private async acceptShipmentDispatchOffer(
    profileId: string,
    input: RespondToShipmentDispatchOfferDto,
  ): Promise<DispatchOffer> {
    const now = new Date();
    let acceptanceContext:
      | {
          shipmentId: string;
          trackingCode: string;
          customerProfileId: string;
          providerId: string;
        }
      | undefined;

    const role = await this.requireUserRole(profileId, [
      UserType.ADMIN,
      UserType.INDIVIDUAL,
    ]);

    const acceptedOffer = await this.prisma.$transaction(async (tx) => {
      const shipmentSeed = await tx.shipment.findUnique({
        where: {
          id: input.shipmentId,
        },
        select: {
          id: true,
          customerProfileId: true,
          trackingCode: true,
          mode: true,
        },
      });

      if (!shipmentSeed) {
        throw new NotFoundException(
          `Shipment with id ${input.shipmentId} not found`,
        );
      }

      if (shipmentSeed.mode !== ShipmentMode.DISPATCH) {
        throw new BadRequestException('Shipment is not a dispatch request');
      }

      if (
        role !== UserType.ADMIN &&
        shipmentSeed.customerProfileId !== profileId
      ) {
        throw new ForbiddenException(
          'Only the shipment owner can review dispatch counters',
        );
      }

      await tx.$queryRaw`
            SELECT id
            FROM "shipments"
            WHERE id = ${shipmentSeed.id}::uuid
            FOR UPDATE
          `;

      const offer = await tx.dispatchOffer.findUnique({
        where: {
          id: input.offerId,
        },
      });

      if (!offer || offer.shipmentId !== shipmentSeed.id) {
        throw new NotFoundException('Dispatch offer not found for this shipment');
      }

      if (offer.status === DispatchOfferStatus.ACCEPTED) {
        return offer;
      }

      if (!this.canOwnerRespondToCounterOffer(offer.status)) {
        throw new BadRequestException(
          'Only pending counter offers can be accepted by the shipper',
        );
      }

      const shipment = await tx.shipment.findUnique({
        where: {
          id: shipmentSeed.id,
        },
        select: {
          id: true,
          trackingCode: true,
          customerProfileId: true,
          status: true,
          vehicleCategory: true,
          pricingCurrency: true,
          finalPriceMinor: true,
          quotedPriceMinor: true,
        },
      });

      if (!shipment) {
        throw new NotFoundException(
          `Shipment with id ${shipmentSeed.id} not found`,
        );
      }

      if (
        shipment.status !== ShipmentStatus.CREATED &&
        shipment.status !== ShipmentStatus.BROADCASTING &&
        shipment.status !== ShipmentStatus.ASSIGNED
      ) {
        throw new BadRequestException(
          `Cannot accept counter offer from shipment status ${shipment.status}`,
        );
      }

      const provider = await tx.provider.findUnique({
        where: {
          id: offer.providerId,
        },
        select: {
          isAvailable: true,
          driverType: true,
        },
      });

      if (!provider?.isAvailable) {
        throw new ConflictException(
          'Provider is currently unavailable and cannot receive this assignment',
        );
      }

      if (provider.driverType !== shipment.vehicleCategory) {
        throw new ConflictException(
          'Driver category no longer matches this dispatch shipment',
        );
      }

      const existingAssignment = await tx.shipmentAssignment.findUnique({
        where: {
          shipmentId: shipment.id,
        },
      });

      if (existingAssignment) {
        const isSameProviderActiveAssignment =
          existingAssignment.providerId === offer.providerId &&
          existingAssignment.status === ShipmentAssignmentStatus.ACTIVE;

        if (!isSameProviderActiveAssignment) {
          throw new ConflictException(DISPATCH_ACCEPT_CONFLICT_MESSAGE);
        }
      }

      const acceptedUpdate = await tx.dispatchOffer.updateMany({
        where: {
          id: offer.id,
          status: DispatchOfferStatus.COUNTERED,
        },
        data: {
          status: DispatchOfferStatus.ACCEPTED,
          respondedAt: input.respondedAt ?? now,
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

      const agreedPriceMinor =
        updatedOffer.counterAmountMinor ??
        shipment.finalPriceMinor ??
        shipment.quotedPriceMinor;
      const agreedCurrency =
        updatedOffer.counterCurrency ?? shipment.pricingCurrency;

      if (agreedPriceMinor == null || !agreedCurrency) {
        throw new BadRequestException(
          'Unable to resolve the agreed shipment price for this assignment',
        );
      }

      if (!existingAssignment) {
        await tx.shipmentAssignment.create({
          data: {
            shipmentId: shipment.id,
            providerId: offer.providerId,
            dispatchOfferId: offer.id,
            status: ShipmentAssignmentStatus.ACTIVE,
            agreedPriceMinor,
            currency: agreedCurrency,
          },
        });
      } else {
        await tx.shipmentAssignment.update({
          where: {
            id: existingAssignment.id,
          },
          data: {
            providerId: offer.providerId,
            dispatchOfferId: offer.id,
            status: ShipmentAssignmentStatus.ACTIVE,
            agreedPriceMinor,
            currency: agreedCurrency,
            cancelledAt: null,
            cancellationReason: null,
          },
        });
      }

      await tx.shipment.update({
        where: {
          id: shipment.id,
        },
        data: {
          status: ShipmentStatus.ASSIGNED,
          finalPriceMinor: agreedPriceMinor,
          pricingCurrency: agreedCurrency,
        },
      });

      await tx.dispatchOffer.updateMany({
        where: {
          shipmentId: shipment.id,
          id: {
            not: offer.id,
          },
          status: {
            in: [
              DispatchOfferStatus.SENT,
              DispatchOfferStatus.VIEWED,
              DispatchOfferStatus.COUNTERED,
            ],
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

      acceptanceContext = {
        shipmentId: shipment.id,
        trackingCode: shipment.trackingCode,
        customerProfileId: shipment.customerProfileId,
        providerId: offer.providerId,
      };

      return updatedOffer;
    });

    if (acceptanceContext) {
      await this.notifications.notifyCustomer(
        acceptanceContext.customerProfileId,
        {
          category: NotificationCategory.DISPATCH,
          title: `Counter accepted for ${acceptanceContext.trackingCode}`,
          body: 'You accepted the driver counter offer and the shipment is now assigned.',
          entityType: 'shipment',
          entityId: acceptanceContext.shipmentId,
        },
      );

      await this.notifications.notifyProviderTeam(
        acceptanceContext.providerId,
        {
          category: NotificationCategory.DISPATCH,
          title: 'Counter offer accepted',
          body: `Your counter offer for shipment ${acceptanceContext.trackingCode} was accepted.`,
          entityType: 'shipment',
          entityId: acceptanceContext.shipmentId,
        },
      );

      await this.notifications.notifyAdmins({
        category: NotificationCategory.DISPATCH,
        title: 'Dispatch counter accepted',
        body: `Counter offer accepted for shipment ${acceptanceContext.trackingCode}.`,
        entityType: 'shipment',
        entityId: acceptanceContext.shipmentId,
        metadata: {
          providerId: acceptanceContext.providerId,
          offerId: acceptedOffer.id,
        },
      });
    }

    return this.toGraphqlDispatchOffer(acceptedOffer);
  }

  private async acceptDispatchOffer(
    providerId: string,
    input: UpdateDispatchOfferDto,
  ): Promise<DispatchOffer> {
    const now = new Date();
    let acceptanceContext:
      | {
          shipmentId: string;
          trackingCode: string;
          customerProfileId: string;
        }
      | undefined;

    const acceptedOffer = await this.prisma.$transaction(async (tx) => {
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
          driverType: true,
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
          trackingCode: true,
          customerProfileId: true,
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

      if (provider.driverType !== shipment.vehicleCategory) {
        throw new ConflictException(
          'Driver category no longer matches this dispatch shipment',
        );
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
            in: [
              DispatchOfferStatus.SENT,
              DispatchOfferStatus.VIEWED,
              DispatchOfferStatus.COUNTERED,
            ],
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

      acceptanceContext = {
        shipmentId: shipment.id,
        trackingCode: shipment.trackingCode,
        customerProfileId: shipment.customerProfileId,
      };

      return updatedOffer;
    });

    if (acceptanceContext) {
      await this.notifications.notifyProviderTeam(providerId, {
        category: NotificationCategory.DISPATCH,
        title: 'Dispatch offer accepted',
        body: `You accepted shipment ${acceptanceContext.trackingCode}.`,
        entityType: 'shipment',
        entityId: acceptanceContext.shipmentId,
      });

      await this.notifications.notifyCustomer(
        acceptanceContext.customerProfileId,
        {
          category: NotificationCategory.DISPATCH,
          title: `Shipment ${acceptanceContext.trackingCode} assigned`,
          body: 'A provider has accepted your shipment.',
          entityType: 'shipment',
          entityId: acceptanceContext.shipmentId,
        },
      );

      await this.notifications.notifyAdmins({
        category: NotificationCategory.DISPATCH,
        title: `Shipment ${acceptanceContext.trackingCode} assigned`,
        body: 'A provider accepted the dispatch offer.',
        entityType: 'shipment',
        entityId: acceptanceContext.shipmentId,
        metadata: {
          providerId,
          offerId: acceptedOffer.id,
        },
      });
    }

    return this.toGraphqlDispatchOffer(acceptedOffer);
  }

  private async notifyShipmentProgress(
    shipmentId: string,
    trackingCode: string,
    customerProfileId: string,
    providerId: string,
    category: NotificationCategory,
    title: string,
    body: string,
  ): Promise<void> {
    await this.notifications.notifyCustomer(customerProfileId, {
      category,
      title,
      body,
      entityType: 'shipment',
      entityId: shipmentId,
    });

    await this.notifications.notifyProviderTeam(providerId, {
      category,
      title,
      body,
      entityType: 'shipment',
      entityId: shipmentId,
    });

    await this.notifications.notifyAdmins({
      category,
      title: `${trackingCode}: ${title}`,
      body,
      entityType: 'shipment',
      entityId: shipmentId,
      metadata: {
        providerId,
      },
    });
  }

  private canRespondToOffer(status: string): boolean {
    return (
      status === DispatchOfferStatus.SENT ||
      status === DispatchOfferStatus.VIEWED
    );
  }

  private canOwnerRespondToCounterOffer(status: string): boolean {
    return status === DispatchOfferStatus.COUNTERED;
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
    pickupLat: number | null,
    pickupLng: number | null,
  ): Promise<EligibleDispatchProvider[]> {
    const hasPickupCoords = pickupLat !== null && pickupLng !== null;
    const staleHeartbeatCutoff = new Date(
      Date.now() - DEFAULT_DRIVER_HEARTBEAT_STALE_MS,
    );

    const providers = await tx.provider.findMany({
      where: {
        isAvailable: true,
        driverType: vehicleCategory,
        driverProfile: {
          is: {
            onboardingStatus: 'approved',
            canDispatch: true,
            profile: {
              activeAppMode: 'driver',
            },
            presence: {
              is: {
                isOnline: true,
                lastHeartbeatAt: {
                  gte: staleHeartbeatCutoff,
                },
              },
            },
          },
        },
      },
      orderBy: [
        { priorityScore: 'desc' },
        { ratingAvg: 'desc' },
        { createdAt: 'asc' },
      ],
      select: {
        id: true,
        driverType: true,
        driverProfile: {
          select: {
            presence: {
              select: {
                lat: true,
                lng: true,
                lastHeartbeatAt: true,
              },
            },
          },
        },
        shipmentAssignments: {
          where: {
            status: ShipmentAssignmentStatus.ACTIVE,
            shipment: {
              status: {
                in: [
                  ShipmentStatus.EN_ROUTE_PICKUP,
                  ShipmentStatus.PICKED_UP,
                  ShipmentStatus.EN_ROUTE_DROPOFF,
                ],
              },
            },
          },
          take: 1,
          select: {
            shipment: {
              select: {
                dropoffAddress: { select: { lat: true, lng: true } },
              },
            },
          },
        },
      },
    });

    const eligibleProviders: EligibleDispatchProvider[] = [];

    for (const provider of providers) {
      if (provider.driverType !== vehicleCategory) {
        continue;
      }

      // Provider must have an active address with coordinates to be eligible
      const providerPresence = provider.driverProfile?.presence;
      if (
        providerPresence?.lat == null ||
        providerPresence?.lng == null ||
        !providerPresence.lastHeartbeatAt ||
        providerPresence.lastHeartbeatAt < staleHeartbeatCutoff
      ) {
        this.logger.debug(
          `Skipping provider ${provider.id}: no fresh live driver presence`,
        );
        continue;
      }

      // Location proximity: provider must be within max radius of the pickup address
      if (hasPickupCoords) {
        const distanceToPickup = this.haversineDistanceKm(
          providerPresence.lat,
          providerPresence.lng,
          pickupLat!,
          pickupLng!,
        );
        if (distanceToPickup > this.dispatchMaxRadiusKm) {
          this.logger.debug(
            `Skipping provider ${provider.id}: ${distanceToPickup.toFixed(1)}km away from pickup (max ${this.dispatchMaxRadiusKm}km)`,
          );
          continue;
        }
      }

      // Route alignment: if the provider has an ongoing dispatch, only include
      // them if the new shipment's pickup aligns with their current route
      // (i.e. new pickup is near their ongoing dropoff)
      const ongoingAssignment = provider.shipmentAssignments[0];
      if (ongoingAssignment) {
        const ongoingDropoff = ongoingAssignment.shipment?.dropoffAddress;
        if (!ongoingDropoff?.lat || !ongoingDropoff?.lng || !hasPickupCoords) {
          this.logger.debug(
            `Skipping provider ${provider.id}: ongoing dispatch but cannot determine route alignment`,
          );
          continue;
        }
        const distanceToOngoingDropoff = this.haversineDistanceKm(
          pickupLat!,
          pickupLng!,
          ongoingDropoff.lat,
          ongoingDropoff.lng,
        );
        if (distanceToOngoingDropoff > this.dispatchRouteAlignKm) {
          this.logger.debug(
            `Skipping provider ${provider.id}: new pickup is ${distanceToOngoingDropoff.toFixed(1)}km from ongoing dropoff (max ${this.dispatchRouteAlignKm}km for route alignment)`,
          );
          continue;
        }
      }

      eligibleProviders.push({
        providerId: provider.id,
      });
    }

    return eligibleProviders;
  }

  private haversineDistanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const toRadians = (value: number) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const deltaLat = toRadians(lat2 - lat1);
    const deltaLon = toRadians(lon2 - lon1);
    const a =
      Math.sin(deltaLat / 2) ** 2 +
      Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(deltaLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
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
    const assignment = await this.prisma.shipmentAssignment.findFirst({
      where: {
        shipmentId,
        providerId,
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

  async resolveProviderIdForProfile(profileId: string): Promise<string | null> {
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
      UserType.BUSINESS,
      UserType.ADMIN,
      UserType.INDIVIDUAL,
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

  private toGraphqlDispatchBatch(batch: PrismaDispatchBatch): DispatchBatch {
    return {
      ...batch,
      openedAt: batch.openedAt ?? undefined,
      closedAt: batch.closedAt ?? undefined,
      expiresAt: batch.expiresAt ?? undefined,
    };
  }

  private toGraphqlDispatchOffer(
    offer: PrismaDispatchOffer,
    related?: { provider?: Provider },
  ): DispatchOffer {
    return {
      ...offer,
      sentAt: offer.sentAt ?? undefined,
      respondedAt: offer.respondedAt ?? undefined,
      expiresAt: offer.expiresAt ?? undefined,
      providerEtaMinutes: offer.providerEtaMinutes ?? undefined,
      counterAmountMinor: offer.counterAmountMinor ?? undefined,
      counterCurrency: offer.counterCurrency ?? undefined,
      counterMessage: offer.counterMessage ?? undefined,
      counteredAt: offer.counteredAt ?? undefined,
      metadata: offer.metadata ?? undefined,
      provider: related?.provider,
    };
  }

  private toGraphqlProvider(provider: PrismaProvider): Provider {
    return {
      ...provider,
      profileId: provider.profileId ?? undefined,
      driverType: provider.driverType ?? undefined,
      ratingAvg: provider.ratingAvg ? Number(provider.ratingAvg) : 0,
    };
  }

  private toGraphqlShipmentAssignment(
    assignment: PrismaShipmentAssignment,
  ): ShipmentAssignment {
    return {
      ...assignment,
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
