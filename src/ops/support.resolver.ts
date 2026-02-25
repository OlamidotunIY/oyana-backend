import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { SupabaseUser } from '../auth/supabase/supabase.types';
import {
  CreateSupportTicketDto,
  ReplySupportTicketDto,
  SupportTicket,
  SupportTicketMessage,
  UpdateSupportTicketStatusDto,
  UserType,
} from '../graphql';
import { SupportService } from './support.service';

@Resolver(() => SupportTicket)
export class SupportResolver {
  constructor(private readonly supportService: SupportService) {}

  @Query(() => [SupportTicket])
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.INDIVIDUAL, UserType.BUSINESS)
  async mySupportTickets(
    @CurrentUser() user: SupabaseUser,
  ): Promise<SupportTicket[]> {
    return this.supportService.mySupportTickets(user.id);
  }

  @Query(() => SupportTicket, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.INDIVIDUAL, UserType.BUSINESS)
  async supportTicket(
    @CurrentUser() user: SupabaseUser,
    @Args('id') id: string,
  ): Promise<SupportTicket | null> {
    return this.supportService.supportTicket(user.id, id);
  }

  @Mutation(() => SupportTicket)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.INDIVIDUAL, UserType.BUSINESS)
  async createSupportTicket(
    @CurrentUser() user: SupabaseUser,
    @Args('input') input: CreateSupportTicketDto,
  ): Promise<SupportTicket> {
    return this.supportService.createSupportTicket(user.id, input);
  }

  @Mutation(() => SupportTicketMessage)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.INDIVIDUAL, UserType.BUSINESS)
  async replySupportTicket(
    @CurrentUser() user: SupabaseUser,
    @Args('input') input: ReplySupportTicketDto,
  ): Promise<SupportTicketMessage> {
    return this.supportService.replySupportTicket(user.id, input);
  }

  @Mutation(() => SupportTicket)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.INDIVIDUAL, UserType.BUSINESS)
  async updateSupportTicketStatus(
    @CurrentUser() user: SupabaseUser,
    @Args('input') input: UpdateSupportTicketStatusDto,
  ): Promise<SupportTicket> {
    return this.supportService.updateSupportTicketStatus(user.id, input);
  }
}
