import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { MarketPlaceService } from './market-place.service';
import {
  ShipmentBid,
  ShipmentBidAward,
  CreateShipmentBidDto,
  UpdateShipmentBidDto,
  AwardShipmentBidDto,
} from '../graphql';

@Resolver(() => ShipmentBid)
export class MarketPlaceResolver {
  constructor(private readonly marketPlaceService: MarketPlaceService) {}

  @Query(() => [ShipmentBid])
  async shipmentBids(@Args('shipmentId') shipmentId: string): Promise<ShipmentBid[]> {
    // TODO: Implement
    return [];
  }

  @Query(() => [ShipmentBid])
  async myBids(): Promise<ShipmentBid[]> {
    // TODO: Implement
    return [];
  }

  @Mutation(() => ShipmentBid)
  async createShipmentBid(@Args('input') input: CreateShipmentBidDto): Promise<ShipmentBid> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  @Mutation(() => ShipmentBid)
  async updateShipmentBid(
    @Args('id') id: string,
    @Args('input') input: UpdateShipmentBidDto,
  ): Promise<ShipmentBid> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  @Mutation(() => ShipmentBid)
  async withdrawBid(@Args('id') id: string): Promise<ShipmentBid> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  @Mutation(() => ShipmentBidAward)
  async awardShipmentBid(
    @Args('input') input: AwardShipmentBidDto,
  ): Promise<ShipmentBidAward> {
    // TODO: Implement
    throw new Error('Not implemented');
  }
}
