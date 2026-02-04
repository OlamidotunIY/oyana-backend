import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { JobsService } from './jobs.service';
import {
  Job,
  JobItem,
  JobEvent,
  JobLocation,
  CreateJobDto,
  UpdateJobDto,
  CancelJobDto,
  AddJobItemDto,
  CreateLocationDto,
} from '../graphql';

@Resolver(() => Job)
export class JobsResolver {
  constructor(private readonly jobsService: JobsService) {}

  @Query(() => [Job])
  async jobs(): Promise<Job[]> {
    // TODO: Implement
    return [];
  }

  @Query(() => Job)
  async job(@Args('id') id: string): Promise<Job | null> {
    // TODO: Implement
    return null;
  }

  @Mutation(() => Job)
  async createJob(@Args('input') input: CreateJobDto): Promise<Job> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  @Mutation(() => Job)
  async updateJob(
    @Args('id') id: string,
    @Args('input') input: UpdateJobDto,
  ): Promise<Job> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  @Mutation(() => Job)
  async cancelJob(@Args('input') input: CancelJobDto): Promise<Job> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  @Mutation(() => JobItem)
  async addJobItem(@Args('input') input: AddJobItemDto): Promise<JobItem> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  @Mutation(() => JobLocation)
  async createLocation(
    @Args('input') input: CreateLocationDto,
  ): Promise<JobLocation> {
    // TODO: Implement
    throw new Error('Not implemented');
  }
}
