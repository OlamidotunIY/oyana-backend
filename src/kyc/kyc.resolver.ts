import { UseGuards } from '@nestjs/common';
import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import type { SupabaseUser } from '../auth/supabase/supabase.types';
import { KycService } from './kyc.service';
import {
  CreateVehicleDto,
  KYCCase,
  KYCDocument,
  NINVerification,
  UploadKYCDocumentDto,
  Vehicle,
  VerifyNINDto,
} from '../graphql';

@Resolver(() => KYCCase)
export class KycResolver {
  constructor(private readonly kycService: KycService) {}

  @Query(() => [KYCCase])
  @UseGuards(GqlAuthGuard)
  async kycCases(@CurrentUser() user: SupabaseUser): Promise<KYCCase[]> {
    return this.kycService.getKycCases(user.id);
  }

  @Query(() => KYCCase, { nullable: true })
  @UseGuards(GqlAuthGuard)
  async kycCase(
    @CurrentUser() user: SupabaseUser,
    @Args('id') id: string,
  ): Promise<KYCCase | null> {
    return this.kycService.getKycCase(user.id, id);
  }

  @Mutation(() => KYCCase)
  @UseGuards(GqlAuthGuard)
  async createKycCase(
    @CurrentUser() user: SupabaseUser,
    @Args('providerId', { nullable: true }) providerId?: string,
  ): Promise<KYCCase> {
    return this.kycService.createKycCase(user.id, providerId);
  }

  @Mutation(() => KYCCase)
  @UseGuards(GqlAuthGuard)
  async submitKycCase(
    @CurrentUser() user: SupabaseUser,
    @Args('id') id: string,
  ): Promise<KYCCase> {
    return this.kycService.submitKycCase(user.id, id);
  }

  @Mutation(() => KYCCase)
  @UseGuards(GqlAuthGuard)
  async reviewKycCase(
    @CurrentUser() user: SupabaseUser,
    @Args('id') id: string,
    @Args('approved') approved: boolean,
  ): Promise<KYCCase> {
    return this.kycService.reviewKycCase(user.id, id, approved);
  }

  @Mutation(() => KYCDocument)
  @UseGuards(GqlAuthGuard)
  async uploadKycDocument(
    @CurrentUser() user: SupabaseUser,
    @Args('input') input: UploadKYCDocumentDto,
  ): Promise<KYCDocument> {
    return this.kycService.uploadKycDocument(user.id, input);
  }

  @Mutation(() => NINVerification)
  @UseGuards(GqlAuthGuard)
  async initiateNinVerification(
    @CurrentUser() user: SupabaseUser,
    @Args('input') input: VerifyNINDto,
  ): Promise<NINVerification> {
    return this.kycService.initiateNinVerification(user.id, input);
  }

  @Mutation(() => Vehicle)
  @UseGuards(GqlAuthGuard)
  async createVehicle(
    @CurrentUser() user: SupabaseUser,
    @Args('input') input: CreateVehicleDto,
  ): Promise<Vehicle> {
    return this.kycService.createVehicle(user.id, input);
  }
}
