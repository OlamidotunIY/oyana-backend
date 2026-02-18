import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import type { User } from '@supabase/supabase-js';
import { MarketPlaceService } from './market-place.service';
import {
  ShipmentBid,
  ShipmentBidAward,
  CreateShipmentBidDto,
  UpdateShipmentBidDto,
  AwardShipmentBidDto,
  MarketplaceShipmentsFilterDto,
  MarketplaceShipmentsResult,
} from '../graphql';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';

@Resolver(() => ShipmentBid)
export class MarketPlaceResolver {
  constructor(private readonly marketPlaceService: MarketPlaceService) {}

  @Query(() => MarketplaceShipmentsResult)
  @UseGuards(GqlAuthGuard)
  async marketplaceShipments(
    @CurrentUser() user: User,
    @Args('filter', { type: () => MarketplaceShipmentsFilterDto, nullable: true })
    filter?: MarketplaceShipmentsFilterDto,
  ): Promise<MarketplaceShipmentsResult> {
    return this.marketPlaceService.marketplaceShipments(user.id, filter);
  }

  @Query(() => [ShipmentBid])
  @UseGuards(GqlAuthGuard)
  async shipmentBids(
    @CurrentUser() user: User,
    @Args('shipmentId') shipmentId: string,
  ): Promise<ShipmentBid[]> {
    return this.marketPlaceService.shipmentBids(user.id, shipmentId);
  }

  @Query(() => [ShipmentBid])
  @UseGuards(GqlAuthGuard)
  async myBids(@CurrentUser() user: User): Promise<ShipmentBid[]> {
    return this.marketPlaceService.myBids(user.id);
  }

  @Mutation(() => ShipmentBid)
  @UseGuards(GqlAuthGuard)
  async createShipmentBid(
    @CurrentUser() user: User,
    @Args('input') input: CreateShipmentBidDto,
  ): Promise<ShipmentBid> {
    return this.marketPlaceService.createShipmentBid(user.id, input);
  }

  @Mutation(() => ShipmentBid)
  @UseGuards(GqlAuthGuard)
  async updateShipmentBid(
    @CurrentUser() user: User,
    @Args('id') id: string,
    @Args('input') input: UpdateShipmentBidDto,
  ): Promise<ShipmentBid> {
    return this.marketPlaceService.updateShipmentBid(user.id, id, input);
  }

  @Mutation(() => ShipmentBid)
  @UseGuards(GqlAuthGuard)
  async withdrawBid(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<ShipmentBid> {
    return this.marketPlaceService.withdrawBid(user.id, id);
  }

  @Mutation(() => ShipmentBidAward)
  @UseGuards(GqlAuthGuard)
  async awardShipmentBid(
    @CurrentUser() user: User,
    @Args('input') input: AwardShipmentBidDto,
  ): Promise<ShipmentBidAward> {
    return this.marketPlaceService.awardShipmentBid(user.id, input);
  }
}
