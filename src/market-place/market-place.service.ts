import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  Prisma,
  Shipment as PrismaShipment,
  ShipmentBid as PrismaShipmentBid,
  ShipmentBidAward as PrismaShipmentBidAward,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  AwardShipmentBidDto,
  BidStatus,
  CreateShipmentBidDto,
  MarketplaceShipmentsFilterDto,
  MarketplaceShipmentsResult,
  Shipment,
  ShipmentAssignmentStatus,
  ShipmentBid,
  ShipmentBidAward,
  ShipmentMode,
  ShipmentStatus,
  UpdateShipmentBidDto,
  VehicleCategory,
} from '../graphql';

const DEFAULT_MARKETPLACE_TAKE = 20;
const MAX_MARKETPLACE_TAKE = 50;

@Injectable()
export class MarketPlaceService {
  constructor(private readonly prisma: PrismaService) {}

  async marketplaceShipments(
    profileId: string,
    filter?: MarketplaceShipmentsFilterDto,
  ): Promise<MarketplaceShipmentsResult> {
    const providerId = await this.resolveProviderIdForProfile(profileId);

    if (!providerId) {
      return { items: [] };
    }

    const vehicleCategories =
      filter?.vehicleCategories?.length
        ? filter.vehicleCategories
        : await this.getProviderVehicleCategories(providerId);

    if (!vehicleCategories.length) {
      return { items: [] };
    }

    const take = Math.min(
      Math.max(filter?.take ?? DEFAULT_MARKETPLACE_TAKE, 1),
      MAX_MARKETPLACE_TAKE,
    );

    const routeQuery = filter?.routeQuery?.trim();
    const cargoQuery = filter?.cargoQuery?.trim();
    const scheduledFrom = filter?.scheduledFrom ?? undefined;
    const scheduledTo = filter?.scheduledTo ?? undefined;
    const distanceKmMax = filter?.distanceKmMax ?? undefined;

    const andFilters: Prisma.ShipmentWhereInput[] = [];

    if (routeQuery) {
      andFilters.push({
        OR: [
          {
            pickupAddress: {
              address: { contains: routeQuery, mode: 'insensitive' },
            },
          },
          {
            pickupAddress: {
              city: { contains: routeQuery, mode: 'insensitive' },
            },
          },
          {
            dropoffAddress: {
              address: { contains: routeQuery, mode: 'insensitive' },
            },
          },
          {
            dropoffAddress: {
              city: { contains: routeQuery, mode: 'insensitive' },
            },
          },
        ],
      });
    }

    if (cargoQuery) {
      andFilters.push({
        OR: [
          {
            packageDescription: { contains: cargoQuery, mode: 'insensitive' },
          },
          {
            items: {
              some: {
                name: { contains: cargoQuery, mode: 'insensitive' },
              },
            },
          },
        ],
      });
    }

    if (scheduledFrom || scheduledTo) {
      const scheduledAt: Prisma.DateTimeFilter = {};
      if (scheduledFrom) {
        scheduledAt.gte = scheduledFrom;
      }
      if (scheduledTo) {
        scheduledAt.lte = scheduledTo;
      }
      andFilters.push({ scheduledAt });
    }

    const where: Prisma.ShipmentWhereInput = {
      mode: ShipmentMode.MARKETPLACE,
      status: {
        in: [ShipmentStatus.CREATED, ShipmentStatus.BROADCASTING],
      },
      vehicleCategory: {
        in: vehicleCategories as VehicleCategory[],
      },
      ...(andFilters.length ? { AND: andFilters } : {}),
    };

    const shipments = await this.prisma.runWithRetry(
      'MarketPlaceService.marketplaceShipments',
      () =>
        this.prisma.shipment.findMany({
          where,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take,
          skip: filter?.cursor ? 1 : 0,
          cursor: filter?.cursor ? { id: filter.cursor } : undefined,
          include: {
            pickupAddress: {
              select: {
                address: true,
                city: true,
                lat: true,
                lng: true,
              },
            },
            dropoffAddress: {
              select: {
                address: true,
                city: true,
                lat: true,
                lng: true,
              },
            },
            items: cargoQuery
              ? {
                  select: {
                    name: true,
                  },
                }
              : undefined,
          },
        }),
    );

    const distanceFiltered = distanceKmMax
      ? shipments.filter((shipment) => {
          const distance = this.calculateDistanceKm(
            shipment.pickupAddress?.lat ?? null,
            shipment.pickupAddress?.lng ?? null,
            shipment.dropoffAddress?.lat ?? null,
            shipment.dropoffAddress?.lng ?? null,
          );
          return distance !== null && distance <= distanceKmMax;
        })
      : shipments;

    const items = distanceFiltered.map((shipment) =>
      this.toGraphqlShipment(shipment, {
        pickupAddressSummary: this.toAddressSummary(shipment.pickupAddress),
        dropoffAddressSummary: this.toAddressSummary(shipment.dropoffAddress),
      }),
    );

    const lastShipment = shipments[shipments.length - 1];

    return {
      items,
      nextCursor: lastShipment?.id ?? undefined,
    };
  }

  async shipmentBids(
    profileId: string,
    shipmentId: string,
  ): Promise<ShipmentBid[]> {
    const providerId = await this.resolveProviderIdForProfile(profileId);

    if (!providerId) {
      return [];
    }

    const bids = await this.prisma.runWithRetry(
      'MarketPlaceService.shipmentBids',
      () =>
        this.prisma.shipmentBid.findMany({
          where: {
            shipmentId,
            providerId,
          },
          include: {
            award: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
    );

    return bids.map((bid) =>
      this.toGraphqlShipmentBid(bid, {
        award: bid.award ? this.toGraphqlShipmentBidAward(bid.award) : undefined,
      }),
    );
  }

  async myBids(profileId: string): Promise<ShipmentBid[]> {
    const providerId = await this.resolveProviderIdForProfile(profileId);

    if (!providerId) {
      return [];
    }

    const bids = await this.prisma.runWithRetry(
      'MarketPlaceService.myBids',
      () =>
        this.prisma.shipmentBid.findMany({
          where: {
            providerId,
            shipment: {
              mode: ShipmentMode.MARKETPLACE,
            },
          },
          include: {
            shipment: {
              include: {
                pickupAddress: {
                  select: {
                    address: true,
                    city: true,
                    lat: true,
                    lng: true,
                  },
                },
                dropoffAddress: {
                  select: {
                    address: true,
                    city: true,
                    lat: true,
                    lng: true,
                  },
                },
              },
            },
            award: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
    );

    return bids.map((bid) =>
      this.toGraphqlShipmentBid(bid, {
        shipment: bid.shipment
          ? this.toGraphqlShipment(bid.shipment, {
              pickupAddressSummary: this.toAddressSummary(
                bid.shipment.pickupAddress,
              ),
              dropoffAddressSummary: this.toAddressSummary(
                bid.shipment.dropoffAddress,
              ),
            })
          : undefined,
        award: bid.award ? this.toGraphqlShipmentBidAward(bid.award) : undefined,
      }),
    );
  }

  async createShipmentBid(
    profileId: string,
    input: CreateShipmentBidDto,
  ): Promise<ShipmentBid> {
    const providerId = await this.resolveProviderIdForProfile(profileId);

    if (!providerId) {
      throw new ForbiddenException('No provider account found for this user');
    }

    const shipment = await this.prisma.runWithRetry(
      'MarketPlaceService.createShipmentBid.shipment',
      () =>
        this.prisma.shipment.findUnique({
          where: { id: input.shipmentId },
          select: {
            id: true,
            mode: true,
            status: true,
            vehicleCategory: true,
            pricingCurrency: true,
          },
        }),
    );

    if (!shipment) {
      throw new NotFoundException(
        `Shipment with id ${input.shipmentId} not found`,
      );
    }

    if (shipment.mode !== ShipmentMode.MARKETPLACE) {
      throw new BadRequestException('Shipment is not a marketplace request');
    }

    if (
      shipment.status !== ShipmentStatus.CREATED &&
      shipment.status !== ShipmentStatus.BROADCASTING
    ) {
      throw new BadRequestException(
        `Shipment is not open for bids (status: ${shipment.status})`,
      );
    }

    await this.requireProviderVehicleCategory(
      providerId,
      shipment.vehicleCategory,
    );

    const existingBid = await this.prisma.runWithRetry(
      'MarketPlaceService.createShipmentBid.existingBid',
      () =>
        this.prisma.shipmentBid.findUnique({
          where: {
            shipmentId_providerId: {
              shipmentId: input.shipmentId,
              providerId,
            },
          },
        }),
    );

    const currency = input.currency ?? shipment.pricingCurrency ?? 'NGN';

    if (existingBid) {
      if (existingBid.status === BidStatus.ACTIVE) {
        throw new BadRequestException('You already have an active bid.');
      }

      if (existingBid.status === BidStatus.ACCEPTED) {
        throw new BadRequestException('Your bid has already been accepted.');
      }

      const updatedBid = await this.prisma.runWithRetry(
        'MarketPlaceService.createShipmentBid.reactivateBid',
        () =>
          this.prisma.shipmentBid.update({
            where: { id: existingBid.id },
            data: {
              amountMinor: input.amountMinor,
              currency,
              message: input.message,
              status: BidStatus.ACTIVE,
            },
          }),
      );

      return this.toGraphqlShipmentBid(updatedBid);
    }

    const bid = await this.prisma.runWithRetry(
      'MarketPlaceService.createShipmentBid.create',
      () =>
        this.prisma.shipmentBid.create({
          data: {
            shipmentId: input.shipmentId,
            providerId,
            amountMinor: input.amountMinor,
            currency,
            message: input.message,
            status: BidStatus.ACTIVE,
          },
        }),
    );

    return this.toGraphqlShipmentBid(bid);
  }

  async updateShipmentBid(
    profileId: string,
    id: string,
    input: UpdateShipmentBidDto,
  ): Promise<ShipmentBid> {
    const providerId = await this.resolveProviderIdForProfile(profileId);

    if (!providerId) {
      throw new ForbiddenException('No provider account found for this user');
    }

    const bid = await this.prisma.runWithRetry(
      'MarketPlaceService.updateShipmentBid.findBid',
      () =>
        this.prisma.shipmentBid.findFirst({
          where: {
            id,
            providerId,
          },
        }),
    );

    if (!bid) {
      throw new NotFoundException('Bid not found for this provider');
    }

    if (bid.status !== BidStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot update bid in ${bid.status} status`,
      );
    }

    if (input.status && input.status !== BidStatus.WITHDRAWN) {
      throw new BadRequestException(
        'Only WITHDRAWN status is allowed when updating bids',
      );
    }

    const updatedBid = await this.prisma.runWithRetry(
      'MarketPlaceService.updateShipmentBid.update',
      () =>
        this.prisma.shipmentBid.update({
          where: { id },
          data: {
            amountMinor: input.amountMinor ?? undefined,
            currency: input.currency ?? undefined,
            message: input.message ?? undefined,
            status: input.status ?? undefined,
          },
        }),
    );

    return this.toGraphqlShipmentBid(updatedBid);
  }

  async withdrawBid(profileId: string, id: string): Promise<ShipmentBid> {
    const providerId = await this.resolveProviderIdForProfile(profileId);

    if (!providerId) {
      throw new ForbiddenException('No provider account found for this user');
    }

    const bid = await this.prisma.runWithRetry(
      'MarketPlaceService.withdrawBid.findBid',
      () =>
        this.prisma.shipmentBid.findFirst({
          where: {
            id,
            providerId,
          },
        }),
    );

    if (!bid) {
      throw new NotFoundException('Bid not found for this provider');
    }

    if (bid.status !== BidStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot withdraw bid in ${bid.status} status`,
      );
    }

    const updatedBid = await this.prisma.runWithRetry(
      'MarketPlaceService.withdrawBid.update',
      () =>
        this.prisma.shipmentBid.update({
          where: { id },
          data: {
            status: BidStatus.WITHDRAWN,
          },
        }),
    );

    return this.toGraphqlShipmentBid(updatedBid);
  }

  async awardShipmentBid(
    profileId: string,
    input: AwardShipmentBidDto,
  ): Promise<ShipmentBidAward> {
    const now = new Date();

    const award = await this.prisma.runWithRetry(
      'MarketPlaceService.awardShipmentBid.transaction',
      () =>
        this.prisma.$transaction(async (tx) => {
          const shipment = await tx.shipment.findUnique({
            where: { id: input.shipmentId },
            select: {
              id: true,
              customerProfileId: true,
              mode: true,
              status: true,
            },
          });

          if (!shipment) {
            throw new NotFoundException(
              `Shipment with id ${input.shipmentId} not found`,
            );
          }

          if (shipment.customerProfileId !== profileId) {
            throw new ForbiddenException(
              'Only the shipment owner can award bids',
            );
          }

          if (shipment.mode !== ShipmentMode.MARKETPLACE) {
            throw new BadRequestException(
              'Shipment is not a marketplace request',
            );
          }

          const bid = await tx.shipmentBid.findFirst({
            where: {
              id: input.bidId,
              shipmentId: input.shipmentId,
            },
          });

          if (!bid) {
            throw new NotFoundException('Bid not found for this shipment');
          }

          if (bid.status !== BidStatus.ACTIVE) {
            throw new BadRequestException(
              `Bid is already in ${bid.status} status`,
            );
          }

          const existingAward = await tx.shipmentBidAward.findUnique({
            where: {
              shipmentId: input.shipmentId,
            },
          });

          if (existingAward) {
            throw new BadRequestException(
              'This shipment already has an awarded bid',
            );
          }

          const createdAward = await tx.shipmentBidAward.create({
            data: {
              shipmentId: input.shipmentId,
              bidId: input.bidId,
              awardedByProfileId: profileId,
              awardedAt: now,
              notes: input.notes,
            },
          });

          await tx.shipmentBid.update({
            where: { id: bid.id },
            data: {
              status: BidStatus.ACCEPTED,
            },
          });

          await tx.shipmentBid.updateMany({
            where: {
              shipmentId: input.shipmentId,
              id: { not: bid.id },
              status: BidStatus.ACTIVE,
            },
            data: {
              status: BidStatus.REJECTED,
            },
          });

          const existingAssignment = await tx.shipmentAssignment.findUnique({
            where: {
              shipmentId: input.shipmentId,
            },
          });

          if (!existingAssignment) {
            await tx.shipmentAssignment.create({
              data: {
                shipmentId: input.shipmentId,
                providerId: bid.providerId,
                status: ShipmentAssignmentStatus.ACTIVE,
                agreedPriceMinor: bid.amountMinor,
                currency: bid.currency,
              },
            });
          }

          await tx.shipment.update({
            where: { id: input.shipmentId },
            data: {
              status: ShipmentStatus.ASSIGNED,
            },
          });

          return createdAward;
        }),
    );

    return this.toGraphqlShipmentBidAward(award);
  }

  private async resolveProviderIdForProfile(
    profileId: string,
  ): Promise<string | null> {
    const provider = await this.prisma.runWithRetry(
      'MarketPlaceService.resolveProviderIdForProfile.provider',
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
      'MarketPlaceService.resolveProviderIdForProfile.providerMember',
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

  private async getProviderVehicleCategories(
    providerId: string,
  ): Promise<VehicleCategory[]> {
    const vehicles = await this.prisma.runWithRetry(
      'MarketPlaceService.getProviderVehicleCategories',
      () =>
        this.prisma.vehicle.findMany({
          where: {
            providerId,
            status: 'active',
          },
          select: {
            category: true,
          },
        }),
    );

    const categories = new Set<VehicleCategory>();
    vehicles.forEach((vehicle) => {
      categories.add(vehicle.category as VehicleCategory);
    });

    return Array.from(categories);
  }

  private async requireProviderVehicleCategory(
    providerId: string,
    category: VehicleCategory,
  ): Promise<void> {
    const vehicle = await this.prisma.runWithRetry(
      'MarketPlaceService.requireProviderVehicleCategory',
      () =>
        this.prisma.vehicle.findFirst({
          where: {
            providerId,
            category,
            status: 'active',
          },
          select: {
            id: true,
          },
        }),
    );

    if (!vehicle) {
      throw new ForbiddenException(
        'Provider does not have an active vehicle for this shipment category',
      );
    }
  }

  private toGraphqlShipment(
    shipment: PrismaShipment & {
      pickupAddress?: { address: string; city: string } | null;
      dropoffAddress?: { address: string; city: string } | null;
    },
    overrides?: Partial<Shipment>,
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
      ...(overrides ?? {}),
    };
  }

  private toGraphqlShipmentBid(
    bid: PrismaShipmentBid,
    related?: { shipment?: Shipment; award?: ShipmentBidAward },
  ): ShipmentBid {
    return {
      ...bid,
      message: bid.message ?? undefined,
      shipment: related?.shipment,
      award: related?.award,
    };
  }

  private toGraphqlShipmentBidAward(
    award: PrismaShipmentBidAward,
  ): ShipmentBidAward {
    return {
      ...award,
      notes: award.notes ?? undefined,
    };
  }

  private toAddressSummary(address: {
    address?: string | null;
    city?: string | null;
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

  private calculateDistanceKm(
    lat1: number | null,
    lon1: number | null,
    lat2: number | null,
    lon2: number | null,
  ): number | null {
    if (
      lat1 === null ||
      lon1 === null ||
      lat2 === null ||
      lon2 === null
    ) {
      return null;
    }

    const toRadians = (value: number) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;

    const deltaLat = toRadians(lat2 - lat1);
    const deltaLon = toRadians(lon2 - lon1);

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(deltaLon / 2) *
        Math.sin(deltaLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadiusKm * c;
  }
}
