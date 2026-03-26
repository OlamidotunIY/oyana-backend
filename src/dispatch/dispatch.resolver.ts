import { ForbiddenException, Inject, UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver, Subscription } from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
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
import { UserType } from '../graphql/enums';
import { DispatchService, DISPATCH_PUBSUB } from './dispatch.service';
import type { AuthUser } from '../auth/auth.types';

@Resolver(() => DispatchBatch)
export class DispatchResolver {
  constructor(
    private readonly dispatchService: DispatchService,
    @Inject(DISPATCH_PUBSUB) private readonly pubSub: PubSub,
  ) {}

  @Query(() => [DispatchBatch])
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  async dispatchBatches(): Promise<DispatchBatch[]> {
    return this.dispatchService.dispatchBatches();
  }

  @Query(() => [DispatchOffer])
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.BUSINESS)
  async myDispatchOffers(
    @CurrentUser() user: AuthUser,
  ): Promise<DispatchOffer[]> {
    return this.dispatchService.myDispatchOffers(user.id);
  }

  @Mutation(() => DispatchBatch)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  async createDispatchBatch(
    @Args('input') input: CreateDispatchBatchDto,
  ): Promise<DispatchBatch> {
    return this.dispatchService.createDispatchBatch(input);
  }

  @Mutation(() => DispatchOffer)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  async sendDispatchOffer(
    @Args('input') input: CreateDispatchOfferDto,
  ): Promise<DispatchOffer> {
    return this.dispatchService.sendDispatchOffer(input);
  }

  @Mutation(() => DispatchOffer)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.BUSINESS)
  async respondToDispatchOffer(
    @CurrentUser() user: AuthUser,
    @Args('input') input: UpdateDispatchOfferDto,
  ): Promise<DispatchOffer> {
    return this.dispatchService.respondToDispatchOffer(user.id, input);
  }

  @Mutation(() => Shipment)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.BUSINESS)
  async markEnRoutePickup(
    @CurrentUser() user: AuthUser,
    @Args('shipmentId') shipmentId: string,
  ): Promise<Shipment> {
    return this.dispatchService.markEnRoutePickup(user.id, shipmentId);
  }

  @Mutation(() => Shipment)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.BUSINESS)
  async confirmPickup(
    @CurrentUser() user: AuthUser,
    @Args('shipmentId') shipmentId: string,
  ): Promise<Shipment> {
    return this.dispatchService.confirmPickup(user.id, shipmentId);
  }

  @Mutation(() => Shipment)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.BUSINESS)
  async confirmDropoff(
    @CurrentUser() user: AuthUser,
    @Args('shipmentId') shipmentId: string,
  ): Promise<Shipment> {
    return this.dispatchService.confirmDropoff(user.id, shipmentId);
  }

  @Mutation(() => ShipmentAssignment)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  async createShipmentAssignment(
    @Args('input') input: AssignShipmentDto,
  ): Promise<ShipmentAssignment> {
    return this.dispatchService.createShipmentAssignment(input);
  }

  @Mutation(() => ShipmentAssignment)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  async updateShipmentAssignment(
    @Args('id') id: string,
    @Args('input') input: AssignShipmentDto,
  ): Promise<ShipmentAssignment> {
    return this.dispatchService.updateShipmentAssignment(id, input);
  }

  @Mutation(() => ShipmentAssignment)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  async cancelShipmentAssignment(
    @Args('id') id: string,
  ): Promise<ShipmentAssignment> {
    return this.dispatchService.cancelShipmentAssignment(id);
  }

  /**
   * Real-time subscription: providers receive their dispatch offers instantly
   * when a shipment is broadcasted. Subscribe over WebSocket.
   *
   * Authentication: connect with `Authorization: Bearer <token>` in
   * connectionParams so the server can identify your provider account.
   */
  @Subscription(() => DispatchOffer, {
    resolve: (payload: { dispatchOfferSent: DispatchOffer }) =>
      payload.dispatchOfferSent,
  })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.BUSINESS)
  async dispatchOfferSent(@CurrentUser() user: AuthUser) {
    const providerId = await this.dispatchService.resolveProviderIdForProfile(
      user.id,
    );
    if (!providerId) {
      throw new ForbiddenException(
        'No provider account found for the authenticated user',
      );
    }
    return this.pubSub.asyncIterableIterator(
      `DISPATCH_OFFER_SENT.${providerId}`,
    );
  }
}
