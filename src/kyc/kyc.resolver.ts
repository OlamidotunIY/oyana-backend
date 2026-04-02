import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { MobileClientGuard } from '../auth/guards/mobile-client.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  CreateKycUploadUrlDto,
  KycUploadUrl,
  MyKycChecksFilterDto,
  ProviderKycCheck,
  ProviderKycStatus,
  StartNinFaceVerificationDto,
  StartPhoneVerificationDto,
  SyncKycStatusDto,
  UserType,
} from '../graphql';
import { KycService } from './kyc.service';
import type { AuthUser } from '../auth/auth.types';

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
export class KycResolver {
  constructor(private readonly kycService: KycService) {}

  @Query(() => ProviderKycStatus, { nullable: true })
  @Roles(UserType.BUSINESS, UserType.ADMIN)
  async myKycStatus(
    @CurrentUser() user: AuthUser,
  ): Promise<ProviderKycStatus | null> {
    return this.kycService.myKycStatus(user.id);
  }

  @Query(() => [ProviderKycCheck])
  @Roles(UserType.BUSINESS, UserType.ADMIN)
  async myKycChecks(
    @CurrentUser() user: AuthUser,
    @Args('filter', { nullable: true }) filter?: MyKycChecksFilterDto,
  ): Promise<ProviderKycCheck[]> {
    return this.kycService.myKycChecks(user.id, filter);
  }

  @Mutation(() => KycUploadUrl)
  @Roles(UserType.BUSINESS)
  @UseGuards(MobileClientGuard)
  async createKycUploadUrl(
    @CurrentUser() user: AuthUser,
    @Args('input') input: CreateKycUploadUrlDto,
  ): Promise<KycUploadUrl> {
    return this.kycService.createKycUploadUrl(user.id, input);
  }

  @Mutation(() => ProviderKycCheck)
  @Roles(UserType.BUSINESS)
  @UseGuards(MobileClientGuard)
  async startNinFaceVerification(
    @CurrentUser() user: AuthUser,
    @Args('input') input: StartNinFaceVerificationDto,
  ): Promise<ProviderKycCheck> {
    return this.kycService.startNinFaceVerification(user.id, input);
  }

  @Mutation(() => ProviderKycCheck)
  @Roles(UserType.BUSINESS)
  @UseGuards(MobileClientGuard)
  async startPhoneVerification(
    @CurrentUser() user: AuthUser,
    @Args('input') input: StartPhoneVerificationDto,
  ): Promise<ProviderKycCheck> {
    return this.kycService.startPhoneVerification(user.id, input);
  }

  @Mutation(() => [ProviderKycCheck])
  @Roles(UserType.BUSINESS)
  @UseGuards(MobileClientGuard)
  async syncKycStatus(
    @CurrentUser() user: AuthUser,
    @Args('input') input: SyncKycStatusDto,
  ): Promise<ProviderKycCheck[]> {
    return this.kycService.syncKycStatus(user.id, input);
  }
}
