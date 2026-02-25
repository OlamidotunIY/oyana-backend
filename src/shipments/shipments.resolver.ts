import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import {
  ShipmentEvent,
  ShipmentTracking,
  Shipment,
  ShipmentDashboard,
  ProviderDashboardQuary,
  ShipmentItem,
  ShipmentQueryFilter,
  CreateShipmentDto,
  UpdateShipmentDto,
  CancelShipmentDto,
  AddShipmentItemDto,
} from '../graphql';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { SupabaseUser } from '../auth/supabase/supabase.types';
import { UserType } from '../graphql/enums';

@Resolver(() => Shipment)
export class ShipmentsResolver {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Query(() => [Shipment])
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.INDIVIDUAL)
  async shipments(
    @CurrentUser() user: SupabaseUser,
    @Args('filter', { type: () => ShipmentQueryFilter, nullable: true })
    filter?: ShipmentQueryFilter,
  ): Promise<Shipment[]> {
    return this.shipmentsService.getShipmentsForViewer(user.id, filter);
  }

  @Query(() => Shipment, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.INDIVIDUAL, UserType.BUSINESS)
  async shipment(
    @CurrentUser() user: SupabaseUser,
    @Args('id') id: string,
  ): Promise<Shipment | null> {
    return this.shipmentsService.getShipmentByIdForViewer(user.id, id);
  }

  @Query(() => [ShipmentEvent])
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.INDIVIDUAL, UserType.BUSINESS)
  async shipmentTimeline(
    @CurrentUser() user: SupabaseUser,
    @Args('id') id: string,
  ): Promise<ShipmentEvent[]> {
    return this.shipmentsService.getShipmentTimelineForViewer(user.id, id);
  }

  @Query(() => ShipmentTracking)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.INDIVIDUAL, UserType.BUSINESS)
  async shipmentTracking(
    @CurrentUser() user: SupabaseUser,
    @Args('id') id: string,
  ): Promise<ShipmentTracking> {
    return this.shipmentsService.getShipmentTrackingForViewer(user.id, id);
  }

  @Query(() => [String])
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.INDIVIDUAL, UserType.BUSINESS)
  async allowedShipmentCurrencies(): Promise<string[]> {
    return this.shipmentsService.getAllowedShipmentCurrencies();
  }

  @Query(() => ShipmentDashboard)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.INDIVIDUAL, UserType.ADMIN)
  async myShipmentDashboard(
    @CurrentUser() user: SupabaseUser,
  ): Promise<ShipmentDashboard> {
    return this.shipmentsService.getCustomerShipmentDashboard(user.id);
  }

  @Query(() => ProviderDashboardQuary)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.BUSINESS, UserType.ADMIN)
  async getProviderDashboardQuary(
    @CurrentUser() user: SupabaseUser,
  ): Promise<ProviderDashboardQuary> {
    return this.shipmentsService.getProviderDashboardQuary(user.id);
  }

  @Query(() => ProviderDashboardQuary)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.BUSINESS, UserType.ADMIN)
  async providerDashboard(
    @CurrentUser() user: SupabaseUser,
  ): Promise<ProviderDashboardQuary> {
    return this.shipmentsService.getProviderDashboardQuary(user.id);
  }

  @Mutation(() => Shipment)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.INDIVIDUAL, UserType.ADMIN)
  async createShipment(
    @CurrentUser() user: SupabaseUser,
    @Args('input') input: CreateShipmentDto,
  ): Promise<Shipment> {
    return this.shipmentsService.createShipment({
      ...input,
      customerProfileId: user.id,
    });
  }

  @Mutation(() => Shipment)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.INDIVIDUAL, UserType.ADMIN)
  async updateShipment(
    @CurrentUser() user: SupabaseUser,
    @Args('id') id: string,
    @Args('input') input: UpdateShipmentDto,
  ): Promise<Shipment> {
    return this.shipmentsService.updateShipment(user.id, id, input);
  }

  @Mutation(() => Shipment)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.INDIVIDUAL)
  async cancelShipment(
    @CurrentUser() user: SupabaseUser,
    @Args('input') input: CancelShipmentDto,
  ): Promise<Shipment> {
    return this.shipmentsService.cancelShipment(user.id, input);
  }

  @Mutation(() => ShipmentItem)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.INDIVIDUAL)
  async addShipmentItem(
    @CurrentUser() user: SupabaseUser,
    @Args('input') input: AddShipmentItemDto,
  ): Promise<ShipmentItem> {
    return this.shipmentsService.addShipmentItem(user.id, input);
  }
}
