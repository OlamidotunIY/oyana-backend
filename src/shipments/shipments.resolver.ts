import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { ShipmentsService } from './shipments.service';
import {
  Shipment,
  ShipmentItem,
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
  async shipments(): Promise<Shipment[]> {
    // TODO: Implement
    return [];
  }

  @Query(() => Shipment, { nullable: true })
  async shipment(@Args('id') id: string): Promise<Shipment | null> {
    // TODO: Implement
    return null;
  }

  @Mutation(() => Shipment)
  async createShipment(@Args('input') input: CreateShipmentDto): Promise<Shipment> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  @Mutation(() => Shipment)
  async updateShipment(
    @Args('id') id: string,
    @Args('input') input: UpdateShipmentDto,
  ): Promise<Shipment> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  @Mutation(() => Shipment)
  async cancelShipment(@Args('input') input: CancelShipmentDto): Promise<Shipment> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  @Mutation(() => ShipmentItem)
  async addShipmentItem(@Args('input') input: AddShipmentItemDto): Promise<ShipmentItem> {
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
