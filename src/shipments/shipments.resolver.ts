import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { ShipmentsService } from './shipments.service';
import {
  Shipment,
  ShipmentItem,
  ShipmentQueryFilter,
  UserAddress,
  CreateShipmentDto,
  UpdateShipmentDto,
  CancelShipmentDto,
  AddShipmentItemDto,
  CreateUserAddressDto,
} from '../graphql';

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

  @Mutation(() => Shipment)
  async createShipment(
    @Args('input') input: CreateShipmentDto,
  ): Promise<Shipment> {
    return this.shipmentsService.createShipment(input);
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

  @Mutation(() => UserAddress)
  async createUserAddress(
    @Args('input') input: CreateUserAddressDto,
  ): Promise<UserAddress> {
    // TODO: Implement
    throw new Error('Not implemented');
  }
}
