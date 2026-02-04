import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { MarketPlaceService } from './market-place.service';
import {
  JobBid,
  BidAward,
  CreateBidDto,
  UpdateBidDto,
  AwardBidDto,
} from '../graphql';

@Resolver(() => JobBid)
export class MarketPlaceResolver {
  constructor(private readonly marketPlaceService: MarketPlaceService) {}

  @Query(() => [JobBid])
  async jobBids(@Args('jobId') jobId: string): Promise<JobBid[]> {
    // TODO: Implement
    return [];
  }

  @Query(() => [JobBid])
  async myBids(): Promise<JobBid[]> {
    // TODO: Implement
    return [];
  }

  @Mutation(() => JobBid)
  async createJobBid(@Args('input') input: CreateBidDto): Promise<JobBid> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  @Mutation(() => JobBid)
  async updateJobBid(
    @Args('id') id: string,
    @Args('input') input: UpdateBidDto,
  ): Promise<JobBid> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  @Mutation(() => JobBid)
  async withdrawBid(@Args('id') id: string): Promise<JobBid> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  @Mutation(() => BidAward)
  async awardBid(@Args('input') input: AwardBidDto): Promise<BidAward> {
    // TODO: Implement
    throw new Error('Not implemented');
  }
}
