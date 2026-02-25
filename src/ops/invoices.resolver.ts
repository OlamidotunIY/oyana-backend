import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { SupabaseUser } from '../auth/supabase/supabase.types';
import {
  CreateInvoiceDto,
  Invoice,
  UpdateInvoiceStatusDto,
  UserType,
} from '../graphql';
import { InvoicesService } from './invoices.service';

@Resolver(() => Invoice)
export class InvoicesResolver {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Query(() => [Invoice])
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.INDIVIDUAL, UserType.BUSINESS)
  async myInvoices(@CurrentUser() user: SupabaseUser): Promise<Invoice[]> {
    return this.invoicesService.myInvoices(user.id);
  }

  @Query(() => Invoice, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN, UserType.INDIVIDUAL, UserType.BUSINESS)
  async invoice(
    @CurrentUser() user: SupabaseUser,
    @Args('id') id: string,
  ): Promise<Invoice | null> {
    return this.invoicesService.invoice(user.id, id);
  }

  @Mutation(() => Invoice)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  async createInvoice(
    @CurrentUser() user: SupabaseUser,
    @Args('input') input: CreateInvoiceDto,
  ): Promise<Invoice> {
    return this.invoicesService.createInvoice(user.id, input);
  }

  @Mutation(() => Invoice)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  async updateInvoiceStatus(
    @CurrentUser() user: SupabaseUser,
    @Args('input') input: UpdateInvoiceStatusDto,
  ): Promise<Invoice> {
    return this.invoicesService.updateInvoiceStatus(user.id, input);
  }
}
