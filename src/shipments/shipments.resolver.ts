import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import type { User } from '@supabase/supabase-js';
import { ShipmentsService } from './shipments.service';
import {
  Shipment,
  ShipmentItem,
  ShipmentQueryFilter,
  CreateShipmentDto,
  UpdateShipmentDto,
  CancelShipmentDto,
  AddShipmentItemDto,
} from '../graphql';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';

@Resolver(() => Shipment)
export class ShipmentsResolver {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Query(() => [Shipment])
  async shipments(
    @Args('filter', { type: () => ShipmentQueryFilter, nullable: true })
    filter?: ShipmentQueryFilter,
  ): Promise<Shipment[]> {
    return this.shipmentsService.getShipments(filter);
  }

  @Query(() => Shipment, { nullable: true })
  async shipment(@Args('id') id: string): Promise<Shipment | null> {
    return this.shipmentsService.getShipmentById(id);
  }

  @Query(() => [String])
  async allowedShipmentCurrencies(): Promise<string[]> {
    return this.shipmentsService.getAllowedShipmentCurrencies();
  }

  @Mutation(() => Shipment)
  @UseGuards(GqlAuthGuard)
  async createShipment(
    @CurrentUser() user: User,
    @Args('input') input: CreateShipmentDto,
  ): Promise<Shipment> {
    return this.shipmentsService.createShipment({
      ...input,
      customerProfileId: user.id,
    });
  }

  @Mutation(() => Shipment)
  async updateShipment(
    @Args('id') id: string,
    @Args('input') input: UpdateShipmentDto,
  ): Promise<Shipment> {
    return this.shipmentsService.updateShipment(id, input);
  }

  @Mutation(() => Shipment)
  async cancelShipment(
    @Args('input') input: CancelShipmentDto,
  ): Promise<Shipment> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  @Mutation(() => ShipmentItem)
  async addShipmentItem(
    @Args('input') input: AddShipmentItemDto,
  ): Promise<ShipmentItem> {
    // TODO: Implement
    throw new Error('Not implemented');
  }
}
