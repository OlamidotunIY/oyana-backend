import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import type { SupabaseUser } from '../auth/supabase/supabase.types';
import {
  AssignShipmentDto,
  CreateDispatchBatchDto,
  CreateDispatchOfferDto,
  DispatchBatch,
  DispatchOffer,
  Shipment,
  ShipmentAssignment,
  UpdateDispatchOfferDto,
} from '../graphql';
import { DispatchService } from './dispatch.service';

@Resolver(() => DispatchBatch)
export class DispatchResolver {
  constructor(private readonly dispatchService: DispatchService) {}

  @Query(() => [DispatchBatch])
  async dispatchBatches(): Promise<DispatchBatch[]> {
    return this.dispatchService.dispatchBatches();
  }

  @Query(() => [DispatchOffer])
  @UseGuards(GqlAuthGuard)
  async myDispatchOffers(@CurrentUser() user: SupabaseUser): Promise<DispatchOffer[]> {
    return this.dispatchService.myDispatchOffers(user.id);
  }

  @Mutation(() => DispatchBatch)
  async createDispatchBatch(
    @Args('input') input: CreateDispatchBatchDto,
  ): Promise<DispatchBatch> {
    return this.dispatchService.createDispatchBatch(input);
  }

  @Mutation(() => DispatchOffer)
  async sendDispatchOffer(
    @Args('input') input: CreateDispatchOfferDto,
  ): Promise<DispatchOffer> {
    return this.dispatchService.sendDispatchOffer(input);
  }

  @Mutation(() => DispatchOffer)
  @UseGuards(GqlAuthGuard)
  async respondToDispatchOffer(
    @CurrentUser() user: SupabaseUser,
    @Args('input') input: UpdateDispatchOfferDto,
  ): Promise<DispatchOffer> {
    return this.dispatchService.respondToDispatchOffer(user.id, input);
  }

  @Mutation(() => Shipment)
  @UseGuards(GqlAuthGuard)
  async markEnRoutePickup(
    @CurrentUser() user: SupabaseUser,
    @Args('shipmentId') shipmentId: string,
  ): Promise<Shipment> {
    return this.dispatchService.markEnRoutePickup(user.id, shipmentId);
  }

  @Mutation(() => Shipment)
  @UseGuards(GqlAuthGuard)
  async confirmPickup(
    @CurrentUser() user: SupabaseUser,
    @Args('shipmentId') shipmentId: string,
  ): Promise<Shipment> {
    return this.dispatchService.confirmPickup(user.id, shipmentId);
  }

  @Mutation(() => Shipment)
  @UseGuards(GqlAuthGuard)
  async confirmDropoff(
    @CurrentUser() user: SupabaseUser,
    @Args('shipmentId') shipmentId: string,
  ): Promise<Shipment> {
    return this.dispatchService.confirmDropoff(user.id, shipmentId);
  }

  @Mutation(() => ShipmentAssignment)
  async createShipmentAssignment(
    @Args('input') input: AssignShipmentDto,
  ): Promise<ShipmentAssignment> {
    return this.dispatchService.createShipmentAssignment(input);
  }

  @Mutation(() => ShipmentAssignment)
  async updateShipmentAssignment(
    @Args('id') id: string,
    @Args('input') input: AssignShipmentDto,
  ): Promise<ShipmentAssignment> {
    return this.dispatchService.updateShipmentAssignment(id, input);
  }

  @Mutation(() => ShipmentAssignment)
  async cancelShipmentAssignment(
    @Args('id') id: string,
  ): Promise<ShipmentAssignment> {
    return this.dispatchService.cancelShipmentAssignment(id);
  }
}
