import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { SupabaseUser } from '../auth/supabase/supabase.types';
import {
  AdminFinanceSummary,
  AdminDashboard,
  AdminDashboardFilterDto,
  AdminOverview,
  AdminProviderOverview,
  ApproveRefundDto,
  CreateSlaRuleDto,
  DisputeCase,
  DispatchBatch,
  FlagFraudCaseDto,
  FraudFlag,
  PlatformConfig,
  ProviderKycCheck,
  ProviderKycStatus,
  Refund,
  Shipment,
  SLARule,
  UpdateFraudFlagStatusDto,
  UpdatePlatformConfigDto,
  UpdateSlaRuleDto,
  UserType,
} from '../graphql';
import { AdminOpsService } from './admin-ops.service';

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
@Roles(UserType.ADMIN)
export class AdminOpsResolver {
  constructor(private readonly adminOpsService: AdminOpsService) {}

  @Query(() => AdminDashboard)
  async adminDashboard(
    @CurrentUser() user: SupabaseUser,
    @Args('input', { nullable: true }) input?: AdminDashboardFilterDto,
  ): Promise<AdminDashboard> {
    return this.adminOpsService.adminDashboard(user.id, input);
  }

  @Query(() => AdminOverview)
  async adminOverview(
    @CurrentUser() user: SupabaseUser,
  ): Promise<AdminOverview> {
    return this.adminOpsService.adminOverview(user.id);
  }

  @Query(() => [Shipment])
  async adminLiveShipments(
    @CurrentUser() user: SupabaseUser,
  ): Promise<Shipment[]> {
    return this.adminOpsService.adminLiveShipments(user.id);
  }

  @Query(() => [DispatchBatch])
  async adminDispatchQueue(
    @CurrentUser() user: SupabaseUser,
  ): Promise<DispatchBatch[]> {
    return this.adminOpsService.adminDispatchQueue(user.id);
  }

  @Query(() => [Shipment])
  async adminMarketplaceBoard(
    @CurrentUser() user: SupabaseUser,
  ): Promise<Shipment[]> {
    return this.adminOpsService.adminMarketplaceBoard(user.id);
  }

  @Query(() => [AdminProviderOverview])
  async adminProviders(
    @CurrentUser() user: SupabaseUser,
  ): Promise<AdminProviderOverview[]> {
    return this.adminOpsService.adminProviders(user.id);
  }

  @Query(() => ProviderKycStatus, { nullable: true })
  async adminProviderKyc(
    @CurrentUser() user: SupabaseUser,
    @Args('providerId') providerId: string,
  ): Promise<ProviderKycStatus | null> {
    return this.adminOpsService.adminProviderKyc(user.id, providerId);
  }

  @Query(() => [ProviderKycCheck])
  async adminProviderKycChecks(
    @CurrentUser() user: SupabaseUser,
    @Args('providerId') providerId: string,
  ): Promise<ProviderKycCheck[]> {
    return this.adminOpsService.adminProviderKycChecks(user.id, providerId);
  }

  @Query(() => [DisputeCase])
  async adminDisputes(
    @CurrentUser() user: SupabaseUser,
  ): Promise<DisputeCase[]> {
    return this.adminOpsService.adminDisputes(user.id);
  }

  @Query(() => [FraudFlag])
  async adminFraudFlags(
    @CurrentUser() user: SupabaseUser,
  ): Promise<FraudFlag[]> {
    return this.adminOpsService.adminFraudFlags(user.id);
  }

  @Query(() => [SLARule])
  async adminSlaRules(@CurrentUser() user: SupabaseUser): Promise<SLARule[]> {
    return this.adminOpsService.adminSlaRules(user.id);
  }

  @Query(() => AdminFinanceSummary)
  async adminFinanceSummary(
    @CurrentUser() user: SupabaseUser,
  ): Promise<AdminFinanceSummary> {
    return this.adminOpsService.adminFinanceSummary(user.id);
  }

  @Query(() => [PlatformConfig])
  async adminConfig(
    @CurrentUser() user: SupabaseUser,
  ): Promise<PlatformConfig[]> {
    return this.adminOpsService.adminConfig(user.id);
  }

  @Mutation(() => FraudFlag)
  async flagFraudCase(
    @CurrentUser() user: SupabaseUser,
    @Args('input') input: FlagFraudCaseDto,
  ): Promise<FraudFlag> {
    return this.adminOpsService.flagFraudCase(user.id, input);
  }

  @Mutation(() => FraudFlag)
  async updateFraudFlagStatus(
    @CurrentUser() user: SupabaseUser,
    @Args('input') input: UpdateFraudFlagStatusDto,
  ): Promise<FraudFlag> {
    return this.adminOpsService.updateFraudFlagStatus(user.id, input);
  }

  @Mutation(() => SLARule)
  async createSlaRule(
    @CurrentUser() user: SupabaseUser,
    @Args('input') input: CreateSlaRuleDto,
  ): Promise<SLARule> {
    return this.adminOpsService.createSlaRule(user.id, input);
  }

  @Mutation(() => SLARule)
  async updateSlaRule(
    @CurrentUser() user: SupabaseUser,
    @Args('input') input: UpdateSlaRuleDto,
  ): Promise<SLARule> {
    return this.adminOpsService.updateSlaRule(user.id, input);
  }

  @Mutation(() => Refund)
  async approveRefund(
    @CurrentUser() user: SupabaseUser,
    @Args('input') input: ApproveRefundDto,
  ): Promise<Refund> {
    return this.adminOpsService.approveRefund(user.id, input);
  }

  @Mutation(() => PlatformConfig)
  async updatePlatformConfig(
    @CurrentUser() user: SupabaseUser,
    @Args('input') input: UpdatePlatformConfigDto,
  ): Promise<PlatformConfig> {
    return this.adminOpsService.updatePlatformConfig(user.id, input);
  }
}
