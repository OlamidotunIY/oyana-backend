import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { DispatchService } from './dispatch.service';
import {
  DispatchBatch,
  DispatchOffer,
  ShipmentAssignment,
  CreateDispatchBatchDto,
  CreateDispatchOfferDto,
  UpdateDispatchOfferDto,
  AssignShipmentDto,
} from '../graphql';

@Resolver(() => DispatchBatch)
export class DispatchResolver {
  constructor(private readonly dispatchService: DispatchService) {}

  @Query(() => [DispatchBatch])
  async dispatchBatches(): Promise<DispatchBatch[]> {
    // TODO: Implement
    return [];
  }

  @Query(() => [DispatchOffer])
  async myDispatchOffers(): Promise<DispatchOffer[]> {
    // TODO: Implement
    return [];
  }

  @Mutation(() => DispatchBatch)
  async createDispatchBatch(
    @Args('input') input: CreateDispatchBatchDto,
  ): Promise<DispatchBatch> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  @Mutation(() => DispatchOffer)
  async sendDispatchOffer(
    @Args('input') input: CreateDispatchOfferDto,
  ): Promise<DispatchOffer> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  @Mutation(() => DispatchOffer)
  async respondToDispatchOffer(
    @Args('input') input: UpdateDispatchOfferDto,
  ): Promise<DispatchOffer> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  @Mutation(() => ShipmentAssignment)
  async createShipmentAssignment(
    @Args('input') input: AssignShipmentDto,
  ): Promise<ShipmentAssignment> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  @Mutation(() => ShipmentAssignment)
  async updateShipmentAssignment(
    @Args('id') id: string,
    @Args('input') input: AssignShipmentDto,
  ): Promise<ShipmentAssignment> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  @Mutation(() => ShipmentAssignment)
  async cancelShipmentAssignment(
    @Args('id') id: string,
  ): Promise<ShipmentAssignment> {
    // TODO: Implement
    throw new Error('Not implemented');
  }
}
