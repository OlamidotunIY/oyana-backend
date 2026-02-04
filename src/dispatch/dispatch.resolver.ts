import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { DispatchService } from './dispatch.service';
import {
  DispatchBatch,
  DispatchOffer,
  JobAssignment,
  CreateDispatchBatchDto,
  CreateDispatchOfferDto,
  UpdateDispatchOfferDto,
  AssignJobDto,
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

  @Mutation(() => JobAssignment)
  async createJobAssignment(
    @Args('input') input: AssignJobDto,
  ): Promise<JobAssignment> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  @Mutation(() => JobAssignment)
  async updateJobAssignment(
    @Args('id') id: string,
    @Args('input') input: AssignJobDto,
  ): Promise<JobAssignment> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  @Mutation(() => JobAssignment)
  async cancelAssignment(@Args('id') id: string): Promise<JobAssignment> {
    // TODO: Implement
    throw new Error('Not implemented');
  }
}
