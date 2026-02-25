import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { SupabaseUser } from '../auth/supabase/supabase.types';
import {
  AddDisputeCommentDto,
  CreateDisputeDto,
  DisputeCase,
  DisputeEvent,
  ResolveDisputeDto,
  UserType,
} from '../graphql';
import { DisputesService } from './disputes.service';

@Resolver(() => DisputeCase)
export class DisputesResolver {
  constructor(private readonly disputesService: DisputesService) {}

  @Query(() => [DisputeCase])
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.INDIVIDUAL, UserType.BUSINESS)
  async myDisputes(@CurrentUser() user: SupabaseUser): Promise<DisputeCase[]> {
    return this.disputesService.myDisputes(user.id);
  }

  @Query(() => DisputeCase, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.INDIVIDUAL, UserType.BUSINESS)
  async dispute(
    @CurrentUser() user: SupabaseUser,
    @Args('id') id: string,
  ): Promise<DisputeCase | null> {
    return this.disputesService.dispute(user.id, id);
  }

  @Mutation(() => DisputeCase)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.INDIVIDUAL, UserType.BUSINESS)
  async createDispute(
    @CurrentUser() user: SupabaseUser,
    @Args('input') input: CreateDisputeDto,
  ): Promise<DisputeCase> {
    return this.disputesService.createDispute(user.id, input);
  }

  @Mutation(() => DisputeEvent)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.INDIVIDUAL, UserType.BUSINESS)
  async addDisputeComment(
    @CurrentUser() user: SupabaseUser,
    @Args('input') input: AddDisputeCommentDto,
  ): Promise<DisputeEvent> {
    return this.disputesService.addDisputeComment(user.id, input);
  }

  @Mutation(() => DisputeCase)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  async resolveDispute(
    @CurrentUser() user: SupabaseUser,
    @Args('input') input: ResolveDisputeDto,
  ): Promise<DisputeCase> {
    return this.disputesService.resolveDispute(user.id, input);
  }
}
