import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
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
import type { SupabaseUser } from '../auth/supabase/supabase.types';

@Resolver(() => ShipmentBid)
export class MarketPlaceResolver {
  constructor(private readonly marketPlaceService: MarketPlaceService) {}

  @Query(() => MarketplaceShipmentsResult)
  @UseGuards(GqlAuthGuard)
  async marketplaceShipments(
    @CurrentUser() user: SupabaseUser,
    @Args('filter', { type: () => MarketplaceShipmentsFilterDto, nullable: true })
    filter?: MarketplaceShipmentsFilterDto,
  ): Promise<MarketplaceShipmentsResult> {
    return this.marketPlaceService.marketplaceShipments(user.id, filter);
  }

  @Query(() => [ShipmentBid])
  @UseGuards(GqlAuthGuard)
  async shipmentBids(
    @CurrentUser() user: SupabaseUser,
    @Args('shipmentId') shipmentId: string,
  ): Promise<ShipmentBid[]> {
    return this.marketPlaceService.shipmentBids(user.id, shipmentId);
  }

  @Query(() => [ShipmentBid])
  @UseGuards(GqlAuthGuard)
  async myBids(@CurrentUser() user: SupabaseUser): Promise<ShipmentBid[]> {
    return this.marketPlaceService.myBids(user.id);
  }

  @Mutation(() => ShipmentBid)
  @UseGuards(GqlAuthGuard)
  async createShipmentBid(
    @CurrentUser() user: SupabaseUser,
    @Args('input') input: CreateShipmentBidDto,
  ): Promise<ShipmentBid> {
    return this.marketPlaceService.createShipmentBid(user.id, input);
  }

  @Mutation(() => ShipmentBid)
  @UseGuards(GqlAuthGuard)
  async updateShipmentBid(
    @CurrentUser() user: SupabaseUser,
    @Args('id') id: string,
    @Args('input') input: UpdateShipmentBidDto,
  ): Promise<ShipmentBid> {
    return this.marketPlaceService.updateShipmentBid(user.id, id, input);
  }

  @Mutation(() => ShipmentBid)
  @UseGuards(GqlAuthGuard)
  async withdrawBid(
    @CurrentUser() user: SupabaseUser,
    @Args('id') id: string,
  ): Promise<ShipmentBid> {
    return this.marketPlaceService.withdrawBid(user.id, id);
  }

  @Mutation(() => ShipmentBidAward)
  @UseGuards(GqlAuthGuard)
  async awardShipmentBid(
    @CurrentUser() user: SupabaseUser,
    @Args('input') input: AwardShipmentBidDto,
  ): Promise<ShipmentBidAward> {
    return this.marketPlaceService.awardShipmentBid(user.id, input);
  }
}
