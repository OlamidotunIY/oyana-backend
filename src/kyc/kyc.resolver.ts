import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { KycService } from './kyc.service';
import {
  KYCCase,
  KYCDocument,
  NINVerification,
  UploadKYCDocumentDto,
  VerifyNINDto,
} from '../graphql';

@Resolver(() => KYCCase)
export class KycResolver {
  constructor(private readonly kycService: KycService) {}

  @Query(() => [KYCCase])
  async kycCases(): Promise<KYCCase[]> {
    // TODO: Implement
    return [];
  }

  @Query(() => KYCCase, { nullable: true })
  async kycCase(@Args('id') id: string): Promise<KYCCase | null> {
    // TODO: Implement
    return null;
  }

  @Mutation(() => KYCCase)
  async createKycCase(
    @Args('providerId') providerId: string,
  ): Promise<KYCCase> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  @Mutation(() => KYCCase)
  async submitKycCase(@Args('id') id: string): Promise<KYCCase> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  @Mutation(() => KYCCase)
  async reviewKycCase(
    @Args('id') id: string,
    @Args('approved') approved: boolean,
  ): Promise<KYCCase> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  @Mutation(() => KYCDocument)
  async uploadKycDocument(
    @Args('input') input: UploadKYCDocumentDto,
  ): Promise<KYCDocument> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  @Mutation(() => NINVerification)
  async initiateNinVerification(
    @Args('input') input: VerifyNINDto,
  ): Promise<NINVerification> {
    // TODO: Implement
    throw new Error('Not implemented');
  }
}
