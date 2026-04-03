import { Resolver, Query, Mutation, Args, Subscription } from '@nestjs/graphql';
import { Inject, UseGuards } from '@nestjs/common';
import { MARKETPLACE_PUBSUB, MarketPlaceService } from './market-place.service';
import {
  ShipmentBid,
  Shipment,
  ShipmentBidAward,
  CreateShipmentBidDto,
  UpdateShipmentBidDto,
  AwardShipmentBidDto,
  MarketplaceShipmentsFilterDto,
  MarketplaceShipmentsResult,
} from '../graphql';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/auth.types';
import { UserType } from '../graphql/enums';
import { PubSub } from 'graphql-subscriptions';

@Resolver(() => ShipmentBid)
export class MarketPlaceResolver {
  constructor(
    private readonly marketPlaceService: MarketPlaceService,
    @Inject(MARKETPLACE_PUBSUB) private readonly pubSub: PubSub,
  ) {}

  @Query(() => MarketplaceShipmentsResult)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.BUSINESS)
  async marketplaceShipments(
    @CurrentUser() user: AuthUser,
    @Args('filter', {
      type: () => MarketplaceShipmentsFilterDto,
      nullable: true,
    })
    filter?: MarketplaceShipmentsFilterDto,
  ): Promise<MarketplaceShipmentsResult> {
    return this.marketPlaceService.marketplaceShipments(user.id, filter);
  }

  @Query(() => [ShipmentBid])
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.BUSINESS)
  async shipmentBids(
    @CurrentUser() user: AuthUser,
    @Args('shipmentId') shipmentId: string,
  ): Promise<ShipmentBid[]> {
    return this.marketPlaceService.shipmentBids(user.id, shipmentId);
  }

  @Query(() => [ShipmentBid])
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.BUSINESS)
  async myBids(@CurrentUser() user: AuthUser): Promise<ShipmentBid[]> {
    return this.marketPlaceService.myBids(user.id);
  }

  @Query(() => [Shipment])
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.INDIVIDUAL, UserType.ADMIN)
  async myFreightRequests(@CurrentUser() user: AuthUser): Promise<Shipment[]> {
    return this.marketPlaceService.myFreightRequests(user.id);
  }

  @Query(() => [ShipmentBid])
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.INDIVIDUAL, UserType.ADMIN)
  async freightRequestBids(
    @CurrentUser() user: AuthUser,
    @Args('shipmentId') shipmentId: string,
  ): Promise<ShipmentBid[]> {
    return this.marketPlaceService.freightRequestBids(user.id, shipmentId);
  }

  @Mutation(() => ShipmentBid)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.BUSINESS)
  async createShipmentBid(
    @CurrentUser() user: AuthUser,
    @Args('input') input: CreateShipmentBidDto,
  ): Promise<ShipmentBid> {
    return this.marketPlaceService.createShipmentBid(user.id, input);
  }

  @Mutation(() => ShipmentBid)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.BUSINESS)
  async updateShipmentBid(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
    @Args('input') input: UpdateShipmentBidDto,
  ): Promise<ShipmentBid> {
    return this.marketPlaceService.updateShipmentBid(user.id, id, input);
  }

  @Mutation(() => ShipmentBid)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.BUSINESS)
  async withdrawBid(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
  ): Promise<ShipmentBid> {
    return this.marketPlaceService.withdrawBid(user.id, id);
  }

  @Mutation(() => ShipmentBidAward)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.INDIVIDUAL, UserType.ADMIN)
  async awardShipmentBid(
    @CurrentUser() user: AuthUser,
    @Args('input') input: AwardShipmentBidDto,
  ): Promise<ShipmentBidAward> {
    return this.marketPlaceService.awardShipmentBid(user.id, input);
  }

  @Subscription(() => ShipmentBid, {
    resolve: (payload: { freightRequestBidUpdated: ShipmentBid }) =>
      payload.freightRequestBidUpdated,
  })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.INDIVIDUAL, UserType.ADMIN)
  async freightRequestBidUpdated(
    @CurrentUser() user: AuthUser,
    @Args('shipmentId') shipmentId: string,
  ) {
    await this.marketPlaceService.assertCanViewFreightRequestBids(
      user.id,
      shipmentId,
    );

    return this.pubSub.asyncIterableIterator(
      `FREIGHT_REQUEST_BID_UPDATED.${shipmentId}`,
    );
  }
}
