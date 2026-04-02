import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Prisma,
  ProviderKycCheck as PrismaProviderKycCheck,
  ProviderKycMedia as PrismaProviderKycMedia,
  ProviderKycProfile as PrismaProviderKycProfile,
} from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../database/prisma.service';
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
import { resolveProfileRole } from '../auth/utils/roles.util';
import { GoogleStorageService } from '../storage/google-storage.service';
import { PremblyClient } from './prembly.client';

type KycCheckType = 'nin_face' | 'phone';
type KycCheckStatus = 'unverified' | 'pending' | 'verified' | 'failed';

type NormalizedCheckResult = {
  checkType: KycCheckType;
  status: KycCheckStatus;
  responseCode?: string;
  confidence?: number;
  message?: string;
  vendorReference?: string;
  maskedIdentifier?: string;
  normalizedData?: Prisma.InputJsonValue;
  rawResponse?: Prisma.InputJsonValue;
  verifiedAt?: Date;
  failedAt?: Date;
};

type CreateCheckOptions = {
  mediaId?: string;
  rawRequest?: Record<string, unknown>;
};

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly googleStorageService: GoogleStorageService,
    private readonly premblyClient: PremblyClient,
  ) {}

  async myKycStatus(profileId: string): Promise<ProviderKycStatus | null> {
    const providerId = await this.resolveProviderIdForProfile(profileId);
    if (!providerId) {
      return null;
    }

    const profile = await this.refreshProviderKycProfile(providerId);

    return this.toGraphqlKycStatus(profile);
  }

  async myKycChecks(
    profileId: string,
    filter?: MyKycChecksFilterDto,
  ): Promise<ProviderKycCheck[]> {
    const providerId = await this.resolveProviderIdForProfile(profileId);
    if (!providerId) {
      return [];
    }

    const normalizedType = this.normalizeCheckTypeInput(filter?.checkType);
    const normalizedStatus = this.normalizeStatusInput(filter?.status);
    const limit = Math.min(Math.max(filter?.limit ?? 30, 1), 100);

    const checks = await this.prisma.providerKycCheck.findMany({
      where: {
        providerId,
        ...(normalizedType ? { checkType: normalizedType } : {}),
        ...(normalizedStatus ? { status: normalizedStatus } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return checks.map((check) => this.toGraphqlKycCheck(check));
  }

  async createKycUploadUrl(
    profileId: string,
    input: CreateKycUploadUrlDto,
  ): Promise<KycUploadUrl> {
    const providerId = await this.requireAuthorizedProviderId(
      profileId,
      input.providerId,
    );

    const mimeType = input.mimeType?.trim();
    if (mimeType && !this.getAllowedMimeTypes().includes(mimeType)) {
      throw new BadRequestException(
        `Unsupported mime type ${mimeType}. Allowed: ${this.getAllowedMimeTypes().join(', ')}`,
      );
    }

    const maxFileBytes = this.getMaxKycFileSizeBytes();
    const sizeBytes = this.parseOptionalBigInt(input.sizeBytes);
    if (sizeBytes !== undefined && sizeBytes > maxFileBytes) {
      throw new BadRequestException(
        `KYC upload is too large. Maximum allowed size is ${maxFileBytes.toString()} bytes`,
      );
    }

    const bucket = this.getKycBucketName();
    const expiresInSeconds = Math.max(
      Number(
        this.configService.get<string>('PREMBLY_KYC_UPLOAD_URL_TTL_SECONDS') ??
          900,
      ),
      60,
    );

    const storagePath = this.buildKycStoragePath(providerId, input.fileName);
    const uploadUrl = await this.googleStorageService.createSignedUploadUrl({
      bucketName: bucket,
      objectPath: storagePath,
      expiresInSeconds,
      contentType: mimeType,
    });

    const media = await this.prisma.providerKycMedia.create({
      data: {
        providerId,
        storageBucket: bucket,
        storagePath,
        mimeType,
        sizeBytes,
        uploadState: 'pending_upload',
        uploadedByProfileId: profileId,
      },
    });

    return {
      mediaId: media.id,
      storageBucket: media.storageBucket,
      storagePath: media.storagePath,
      uploadUrl,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
    };
  }

  async startNinFaceVerification(
    profileId: string,
    input: StartNinFaceVerificationDto,
  ): Promise<ProviderKycCheck> {
    const providerId = await this.requireAuthorizedProviderId(
      profileId,
      input.providerId,
    );
    const media = await this.requireProviderMedia(
      providerId,
      input.faceMediaId,
    );
    const imageBase64 = await this.fetchMediaAsBase64(
      media.storageBucket,
      media.storagePath,
    );

    const response = await this.premblyClient.ninWithFace({
      image: imageBase64,
      numberNin: input.numberNin,
      dateOfBirth: input.dateOfBirth,
    });

    const normalized = this.normalizeNinFaceResult(input.numberNin, response);
    const check = await this.createCheckAndRefreshProfile(
      providerId,
      profileId,
      normalized,
      {
        mediaId: media.id,
        rawRequest: {
          numberNin: input.numberNin,
          dateOfBirth: input.dateOfBirth,
          faceMediaId: input.faceMediaId,
        },
      },
    );

    return this.toGraphqlKycCheck(check);
  }

  async startPhoneVerification(
    profileId: string,
    input: StartPhoneVerificationDto,
  ): Promise<ProviderKycCheck> {
    const providerId = await this.requireAuthorizedProviderId(
      profileId,
      input.providerId,
    );

    const response = await this.premblyClient.verifyPhone({
      phoneNumber: input.phoneNumber,
    });

    const normalized = this.normalizePhoneResult(input.phoneNumber, response);
    const check = await this.createCheckAndRefreshProfile(
      providerId,
      profileId,
      normalized,
      {
        rawRequest: {
          phoneNumber: input.phoneNumber,
        },
      },
    );

    return this.toGraphqlKycCheck(check);
  }

  async syncKycStatus(
    profileId: string,
    input: SyncKycStatusDto,
  ): Promise<ProviderKycCheck[]> {
    const providerId = await this.requireAuthorizedProviderId(
      profileId,
      input.providerId,
    );

    if (!this.isStatusPollingEnabled()) {
      throw new BadRequestException(
        'KYC status polling is not configured for this environment',
      );
    }

    const targets = await this.resolveSyncTargets(providerId, input);
    if (!targets.length) {
      return [];
    }

    const updatedChecks: ProviderKycCheck[] = [];

    for (const target of targets) {
      if (!target.vendorReference) {
        this.logger.warn(
          `Skipping status sync for check ${target.id} because vendor reference is missing`,
        );
        continue;
      }

      const statusResponse = await this.premblyClient.fetchStatus({
        reference: target.vendorReference,
      });

      const normalized = this.normalizeResultByCheckType(
        target.checkType as KycCheckType,
        statusResponse,
        target.maskedIdentifier ?? undefined,
      );

      const check = await this.updateCheckAndRefreshProfile(
        target.id,
        normalized,
        {
          rawResponse: statusResponse,
        },
      );
      updatedChecks.push(this.toGraphqlKycCheck(check));
    }

    return updatedChecks;
  }

  async handlePremblyWebhook(
    payload: Record<string, unknown>,
    rawBody: string,
    signature?: string,
  ): Promise<void> {
    this.assertWebhookSignature(rawBody, signature);

    const vendorReference = this.extractVendorReference(payload);
    if (!vendorReference) {
      this.logger.warn('Ignoring Prembly webhook without vendor reference');
      return;
    }

    const existingCheck = await this.prisma.providerKycCheck.findUnique({
      where: {
        vendorReference,
      },
    });

    if (!existingCheck) {
      this.logger.warn(
        `Ignoring Prembly webhook for unknown reference ${vendorReference}`,
      );
      return;
    }

    const normalized = this.normalizeResultByCheckType(
      existingCheck.checkType as KycCheckType,
      payload,
      existingCheck.maskedIdentifier ?? undefined,
    );

    await this.updateCheckAndRefreshProfile(existingCheck.id, normalized, {
      rawResponse: payload,
    });

    this.logger.log(
      `Processed Prembly webhook reference=${vendorReference} checkId=${existingCheck.id}`,
    );
  }

  async getProviderKycStatusForAdmin(
    providerId: string,
  ): Promise<ProviderKycStatus | null> {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      select: { id: true },
    });

    if (!provider) {
      return null;
    }

    const profile = await this.refreshProviderKycProfile(providerId);

    return this.toGraphqlKycStatus(profile);
  }

  async getProviderKycChecksForAdmin(
    providerId: string,
  ): Promise<ProviderKycCheck[]> {
    const checks = await this.prisma.providerKycCheck.findMany({
      where: { providerId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return checks.map((check) => this.toGraphqlKycCheck(check));
  }

  async cleanupExpiredRawPayloads(referenceDate = new Date()): Promise<number> {
    const result = await this.prisma.providerKycCheck.updateMany({
      where: {
        expiresAt: {
          lt: referenceDate,
        },
      },
      data: {
        rawRequest: Prisma.DbNull,
        rawResponse: Prisma.DbNull,
      },
    });

    if (result.count > 0) {
      this.logger.log(
        `Purged raw KYC payloads for ${result.count} expired check(s)`,
      );
    }

    return result.count;
  }

  private async createCheckAndRefreshProfile(
    providerId: string,
    initiatedByProfileId: string,
    normalized: NormalizedCheckResult,
    options: CreateCheckOptions,
  ): Promise<PrismaProviderKycCheck> {
    const profile = await this.ensureProviderKycProfile(providerId);
    const expiresAt = this.getRawPayloadExpiryTimestamp();

    const data: Prisma.ProviderKycCheckUncheckedCreateInput = {
      providerId,
      profileId: profile.id,
      checkType: normalized.checkType,
      status: normalized.status,
      vendor: 'prembly',
      vendorReference: normalized.vendorReference,
      responseCode: normalized.responseCode,
      confidence: normalized.confidence,
      message: normalized.message,
      maskedIdentifier: normalized.maskedIdentifier,
      normalizedData: normalized.normalizedData,
      rawRequest: options.rawRequest
        ? (this.toJsonValue(options.rawRequest) as Prisma.InputJsonValue)
        : undefined,
      rawResponse: normalized.rawResponse,
      expiresAt,
      verifiedAt: normalized.verifiedAt,
      failedAt: normalized.failedAt,
      initiatedByProfileId,
    };

    let check: PrismaProviderKycCheck;

    if (normalized.vendorReference) {
      const existing = await this.prisma.providerKycCheck.findUnique({
        where: {
          vendorReference: normalized.vendorReference,
        },
      });

      if (existing && existing.providerId === providerId) {
        check = await this.prisma.providerKycCheck.update({
          where: {
            id: existing.id,
          },
          data: {
            status: normalized.status,
            responseCode: normalized.responseCode,
            confidence: normalized.confidence,
            message: normalized.message,
            maskedIdentifier: normalized.maskedIdentifier,
            normalizedData: normalized.normalizedData,
            rawRequest: options.rawRequest
              ? (this.toJsonValue(options.rawRequest) as Prisma.InputJsonValue)
              : undefined,
            rawResponse: normalized.rawResponse,
            expiresAt,
            verifiedAt: normalized.verifiedAt,
            failedAt: normalized.failedAt,
            initiatedByProfileId,
          },
        });
      } else {
        check = await this.prisma.providerKycCheck.create({
          data,
        });
      }
    } else {
      check = await this.prisma.providerKycCheck.create({
        data,
      });
    }

    if (options.mediaId) {
      await this.prisma.providerKycMedia.update({
        where: { id: options.mediaId },
        data: {
          checkId: check.id,
          uploadState: 'attached',
        },
      });
    }

    await this.refreshProviderKycProfile(providerId);
    return check;
  }

  private async updateCheckAndRefreshProfile(
    checkId: string,
    normalized: NormalizedCheckResult,
    options?: {
      rawResponse?: Record<string, unknown>;
    },
  ): Promise<PrismaProviderKycCheck> {
    const check = await this.prisma.providerKycCheck.update({
      where: { id: checkId },
      data: {
        status: normalized.status,
        responseCode: normalized.responseCode,
        confidence: normalized.confidence,
        message: normalized.message,
        maskedIdentifier: normalized.maskedIdentifier,
        normalizedData: normalized.normalizedData,
        rawResponse: options?.rawResponse
          ? (this.toJsonValue(options.rawResponse) as Prisma.InputJsonValue)
          : normalized.rawResponse,
        expiresAt: options?.rawResponse
          ? this.getRawPayloadExpiryTimestamp()
          : undefined,
        verifiedAt: normalized.verifiedAt,
        failedAt: normalized.failedAt,
        vendorReference: normalized.vendorReference,
      },
    });

    await this.refreshProviderKycProfile(check.providerId);
    return check;
  }

  private async refreshProviderKycProfile(
    providerId: string,
  ): Promise<PrismaProviderKycProfile> {
    const checks = await this.prisma.providerKycCheck.findMany({
      where: {
        providerId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const latestByType = new Map<KycCheckType, PrismaProviderKycCheck>();
    for (const check of checks) {
      const checkType = this.normalizeCheckTypeInput(check.checkType);
      if (!checkType || latestByType.has(checkType)) {
        continue;
      }
      latestByType.set(checkType, check);
    }

    const ninCheck = latestByType.get('nin_face');
    const phoneCheck = latestByType.get('phone');
    const ninStatus = this.normalizeStoredStatus(ninCheck?.status);
    const faceStatus = ninStatus;
    const phoneStatus = this.normalizeStoredStatus(phoneCheck?.status);

    const requiredStatuses: KycCheckStatus[] = [
      ninStatus,
      phoneStatus,
    ];

    const overallStatus = this.calculateOverallStatus(requiredStatuses);
    const kycLevel = this.calculateKycLevel({
      ninStatus,
      faceStatus,
      phoneStatus,
    });

    const failedMessages = [ninCheck, phoneCheck]
      .filter(
        (check) =>
          check && this.normalizeStoredStatus(check.status) === 'failed',
      )
      .map(
        (check) =>
          `${this.humanizeCheckType(check!.checkType)}: ${check!.message ?? 'failed'}`,
      );

    const profile = await this.prisma.providerKycProfile.upsert({
      where: {
        providerId,
      },
      create: {
        providerId,
        overallStatus,
        kycLevel,
        ninStatus,
        phoneStatus,
        faceStatus,
        ninVerifiedAt:
          ninStatus === 'verified'
            ? (ninCheck?.verifiedAt ?? new Date())
            : null,
        phoneVerifiedAt:
          phoneStatus === 'verified'
            ? (phoneCheck?.verifiedAt ?? new Date())
            : null,
        faceVerifiedAt:
          faceStatus === 'verified'
            ? (ninCheck?.verifiedAt ?? new Date())
            : null,
        faceConfidence: ninCheck?.confidence ?? undefined,
        maskedNin: ninCheck?.maskedIdentifier ?? null,
        maskedPhone: phoneCheck?.maskedIdentifier ?? null,
        failureSummary: failedMessages.length
          ? failedMessages.join(' | ')
          : null,
        lastVendorSyncAt: new Date(),
        lastCheckAt: checks[0]?.createdAt ?? null,
      },
      update: {
        overallStatus,
        kycLevel,
        ninStatus,
        phoneStatus,
        faceStatus,
        ninVerifiedAt:
          ninStatus === 'verified'
            ? (ninCheck?.verifiedAt ?? new Date())
            : null,
        phoneVerifiedAt:
          phoneStatus === 'verified'
            ? (phoneCheck?.verifiedAt ?? new Date())
            : null,
        faceVerifiedAt:
          faceStatus === 'verified'
            ? (ninCheck?.verifiedAt ?? new Date())
            : null,
        faceConfidence: ninCheck?.confidence ?? null,
        maskedNin: ninCheck?.maskedIdentifier ?? null,
        maskedPhone: phoneCheck?.maskedIdentifier ?? null,
        failureSummary: failedMessages.length
          ? failedMessages.join(' | ')
          : null,
        lastVendorSyncAt: new Date(),
        lastCheckAt: checks[0]?.createdAt ?? null,
      },
    });

    return profile;
  }

  private calculateOverallStatus(
    requiredStatuses: KycCheckStatus[],
  ): KycCheckStatus {
    if (requiredStatuses.every((status) => status === 'verified')) {
      return 'verified';
    }

    if (requiredStatuses.some((status) => status === 'failed')) {
      return 'failed';
    }

    if (
      requiredStatuses.some(
        (status) => status === 'pending' || status === 'verified',
      )
    ) {
      return 'pending';
    }

    return 'unverified';
  }

  private calculateKycLevel(input: {
    ninStatus: KycCheckStatus;
    faceStatus: KycCheckStatus;
    phoneStatus: KycCheckStatus;
  }): number {
    let level = 0;

    if (input.ninStatus === 'verified' && input.faceStatus === 'verified') {
      level += 1;
    }
    if (input.phoneStatus === 'verified') {
      level += 1;
    }

    return level;
  }

  private normalizeNinFaceResult(
    nin: string,
    response: Record<string, unknown>,
    existingMasked?: string,
  ): NormalizedCheckResult {
    const dataObject = this.readObject(response.data);
    const root = dataObject ?? response;

    const statusFlag = this.readBoolean(root.status);
    const detail =
      this.readString(root.detail) ?? this.readString(root.message);
    const responseCode =
      this.readString(root.response_code) ??
      this.readString(root.responseCode) ??
      undefined;

    const ninData = this.readObject(root.nin_data) ?? {};
    const nestedFace = this.readObject(ninData.face_data);
    const topFace = this.readObject(root.face_data);
    const faceData = nestedFace ?? topFace ?? {};

    const faceStatus =
      this.readBoolean(faceData.status) ??
      (this.readString(faceData.status)?.toLowerCase() === 'verified'
        ? true
        : null);
    const confidence = this.readNumber(faceData.confidence);

    const responseSuccessCode =
      responseCode === '00' || responseCode === undefined;
    const isVerified =
      Boolean(statusFlag) && responseSuccessCode && faceStatus !== false;

    const vendorReference =
      this.readString(this.readObject(root.verification)?.reference) ??
      this.readString(ninData.trackingId) ??
      this.readString(root.reference) ??
      undefined;

    const maskedNin =
      existingMasked ?? this.maskNin(this.readString(ninData.nin) ?? nin);

    const normalizedData: Record<string, unknown> = {
      source: 'prembly',
      firstName: this.readString(ninData.firstname),
      middleName: this.readString(ninData.middlename),
      lastName: this.readString(ninData.surname),
      gender: this.readString(ninData.gender),
      dateOfBirth:
        this.readString(ninData.birthdate) ??
        this.readString((ninData as Record<string, unknown>).date_of_birth),
      faceMessage: this.readString(faceData.message),
      faceResponseCode: this.readString(faceData.response_code),
      reference: vendorReference,
    };

    const status: KycCheckStatus = isVerified
      ? 'verified'
      : statusFlag
        ? 'pending'
        : 'failed';

    return {
      checkType: 'nin_face',
      status,
      responseCode,
      confidence: confidence ?? undefined,
      message: detail ?? this.readString(faceData.message) ?? undefined,
      vendorReference,
      maskedIdentifier: maskedNin,
      normalizedData: this.toJsonValue(normalizedData) as Prisma.InputJsonValue,
      rawResponse: this.toJsonValue(response) as Prisma.InputJsonValue,
      verifiedAt: status === 'verified' ? new Date() : undefined,
      failedAt: status === 'failed' ? new Date() : undefined,
    };
  }

  private normalizePhoneResult(
    phoneNumber: string,
    response: Record<string, unknown>,
    existingMasked?: string,
  ): NormalizedCheckResult {
    const dataObject = this.readObject(response.data);
    const root = dataObject ?? response;

    const statusFlag = this.readBoolean(root.status);
    const verification = this.readObject(root.verification);
    const verificationStatus = this.readString(
      verification?.status,
    )?.toUpperCase();
    const responseCode =
      this.readString(root.response_code) ??
      this.readString(root.responseCode) ??
      undefined;

    const isVerified =
      verificationStatus === 'VERIFIED' ||
      (Boolean(statusFlag) && (responseCode === '00' || !responseCode));

    const vendorReference =
      this.readString(verification?.reference) ??
      this.readString(root.reference) ??
      undefined;

    const status: KycCheckStatus = isVerified
      ? 'verified'
      : statusFlag
        ? 'pending'
        : 'failed';

    const message =
      this.readString(root.detail) ??
      this.readString(root.message) ??
      this.readString(verification?.message) ??
      undefined;

    return {
      checkType: 'phone',
      status,
      responseCode,
      message,
      vendorReference,
      maskedIdentifier: existingMasked ?? this.maskPhone(phoneNumber),
      normalizedData: this.toJsonValue({
        source: 'prembly',
        reference: vendorReference,
      }) as Prisma.InputJsonValue,
      rawResponse: this.toJsonValue(response) as Prisma.InputJsonValue,
      verifiedAt: status === 'verified' ? new Date() : undefined,
      failedAt: status === 'failed' ? new Date() : undefined,
    };
  }

  private normalizeResultByCheckType(
    checkType: KycCheckType,
    response: Record<string, unknown>,
    existingMasked?: string,
  ): NormalizedCheckResult {
    if (checkType === 'nin_face') {
      return this.normalizeNinFaceResult('', response, existingMasked);
    }

    if (checkType === 'phone') {
      return this.normalizePhoneResult('', response, existingMasked);
    }

    throw new BadRequestException(`Unsupported KYC check type ${checkType}`);
  }

  private async resolveSyncTargets(
    providerId: string,
    input: SyncKycStatusDto,
  ): Promise<PrismaProviderKycCheck[]> {
    if (input.checkId) {
      const check = await this.prisma.providerKycCheck.findFirst({
        where: {
          id: input.checkId,
          providerId,
        },
      });

      if (!check) {
        throw new NotFoundException(`KYC check ${input.checkId} not found`);
      }

      return [check];
    }

    if (input.vendorReference?.trim()) {
      const reference = input.vendorReference.trim();
      const check = await this.prisma.providerKycCheck.findFirst({
        where: {
          providerId,
          vendorReference: reference,
        },
      });

      if (!check) {
        throw new NotFoundException(
          `KYC check with reference ${reference} not found`,
        );
      }

      return [check];
    }

    return this.prisma.providerKycCheck.findMany({
      where: {
        providerId,
        status: {
          in: ['pending'],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    });
  }

  private async resolveProviderIdForProfile(
    profileId: string,
  ): Promise<string | null> {
    const driverProfile = await this.prisma.driverProfile.findUnique({
      where: {
        profileId,
      },
      select: {
        providerId: true,
      },
    });

    if (driverProfile?.providerId) {
      return driverProfile.providerId;
    }

    const provider = await this.prisma.provider.findFirst({
      where: {
        OR: [
          {
            profileId,
          },
          {
            members: {
              some: {
                profileId,
                status: 'active',
              },
            },
          },
        ],
      },
      select: {
        id: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return provider?.id ?? null;
  }

  private async requireAuthorizedProviderId(
    profileId: string,
    requestedProviderId?: string,
  ): Promise<string> {
    if (requestedProviderId?.trim()) {
      const providerId = requestedProviderId.trim();
      const hasAccess = await this.prisma.provider.findFirst({
        where: {
          id: providerId,
          OR: [
            { profileId },
            {
              members: {
                some: {
                  profileId,
                  status: 'active',
                },
              },
            },
          ],
        },
        select: { id: true },
      });

      if (hasAccess) {
        return providerId;
      }

      const role = await this.getUserRole(profileId);
      if (role === UserType.ADMIN) {
        const providerExists = await this.prisma.provider.findUnique({
          where: { id: providerId },
          select: { id: true },
        });

        if (!providerExists) {
          throw new NotFoundException(`Provider ${providerId} not found`);
        }

        return providerId;
      }

      throw new ForbiddenException(
        'You are not allowed to access this provider',
      );
    }

    const resolved = await this.resolveProviderIdForProfile(profileId);
    if (!resolved) {
      const role = await this.getUserRole(profileId);
      if (role === UserType.ADMIN) {
        throw new BadRequestException(
          'providerId is required for this operation when executed as admin',
        );
      }

      throw new ForbiddenException(
        'Provider account is required for this operation',
      );
    }

    return resolved;
  }

  private async getUserRole(profileId: string): Promise<UserType> {
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      select: {
        role: true,
        accountRole: true,
        activeAppMode: true,
        driverProfile: {
          select: {
            onboardingStatus: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return resolveProfileRole(profile, [
      UserType.ADMIN,
      UserType.BUSINESS,
      UserType.INDIVIDUAL,
    ]);
  }

  private async ensureProviderKycProfile(
    providerId: string,
  ): Promise<PrismaProviderKycProfile> {
    return (async () => {
      const existing = await this.prisma.providerKycProfile.findUnique({
        where: {
          providerId,
        },
      });

      if (existing) {
        return existing;
      }

      return this.prisma.providerKycProfile.create({
        data: {
          providerId,
        },
      });
    })();
  }

  private async requireProviderMedia(
    providerId: string,
    mediaId: string,
  ): Promise<PrismaProviderKycMedia> {
    const media = await this.prisma.providerKycMedia.findFirst({
      where: {
        id: mediaId,
        providerId,
      },
    });

    if (!media) {
      throw new NotFoundException(`KYC media ${mediaId} not found`);
    }

    return media;
  }

  private async fetchMediaAsBase64(
    bucket: string,
    path: string,
  ): Promise<string> {
    const buffer = await this.googleStorageService.downloadAsBuffer(
      bucket,
      path,
    );
    if (buffer.length === 0) {
      throw new BadRequestException('Uploaded media is empty');
    }

    return buffer.toString('base64');
  }

  private getKycBucketName(): string {
    return (
      this.configService.get<string>('PREMBLY_KYC_BUCKET')?.trim() ||
      this.configService.get<string>('STORAGE_BUCKET_NAME')?.trim() ||
      'kyc-verifications'
    );
  }

  private isStatusPollingEnabled(): boolean {
    const statusEndpoint = this.configService
      .get<string>('PREMBLY_STATUS_ENDPOINT')
      ?.trim();
    return Boolean(statusEndpoint);
  }

  private assertWebhookSignature(rawBody: string, signature?: string): void {
    const secret = this.configService
      .get<string>('PREMBLY_WEBHOOK_SECRET')
      ?.trim();

    if (!secret) {
      return;
    }

    if (!signature || !signature.trim()) {
      throw new ForbiddenException('Invalid Prembly webhook signature');
    }

    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const received = signature.trim().replace(/^sha256=/i, '');

    if (expected.length !== received.length) {
      throw new ForbiddenException('Invalid Prembly webhook signature');
    }

    const expectedBuffer = Buffer.from(expected, 'utf8');
    const receivedBuffer = Buffer.from(received, 'utf8');

    if (!timingSafeEqual(expectedBuffer, receivedBuffer)) {
      throw new ForbiddenException('Invalid Prembly webhook signature');
    }
  }

  private extractVendorReference(
    payload: Record<string, unknown>,
  ): string | null {
    const data = this.readObject(payload.data);
    const verification = this.readObject(payload.verification);
    const dataVerification = this.readObject(data?.verification);

    return (
      this.readString(payload.reference) ??
      this.readString(verification?.reference) ??
      this.readString(data?.reference) ??
      this.readString(dataVerification?.reference) ??
      null
    );
  }

  private buildKycStoragePath(providerId: string, rawFileName: string): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const cleanFileName = this.sanitizeFileName(rawFileName);
    const random = Math.random().toString(36).slice(2, 10);

    return `providers/${providerId}/${year}/${month}/${Date.now()}-${random}-${cleanFileName}`;
  }

  private sanitizeFileName(fileName: string): string {
    const trimmed = fileName.trim();
    if (!trimmed) {
      return 'selfie.jpg';
    }

    const nameOnly = trimmed.replace(/[/\\]/g, '_');
    const asciiOnly = nameOnly.replace(/[^a-zA-Z0-9._-]/g, '_');

    return asciiOnly.length > 0 ? asciiOnly.slice(-120) : 'selfie.jpg';
  }

  private parseOptionalBigInt(value: unknown): bigint | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }

    if (typeof value === 'bigint') {
      return value;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return BigInt(Math.trunc(value));
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      try {
        return BigInt(value.trim());
      } catch {
        return undefined;
      }
    }

    return undefined;
  }

  private getAllowedMimeTypes(): string[] {
    const configured = this.configService
      .get<string>('PREMBLY_KYC_ALLOWED_MIME_TYPES')
      ?.trim();

    if (!configured) {
      return ['image/jpeg', 'image/png', 'image/webp'];
    }

    return configured
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private getMaxKycFileSizeBytes(): bigint {
    const configured = this.configService
      .get<string>('PREMBLY_KYC_MAX_FILE_SIZE_BYTES')
      ?.trim();

    if (!configured) {
      return BigInt(5 * 1024 * 1024);
    }

    try {
      return BigInt(configured);
    } catch {
      return BigInt(5 * 1024 * 1024);
    }
  }

  private getRawPayloadExpiryTimestamp(): Date {
    const retentionDays = Number(
      this.configService.get<string>('PREMBLY_RAW_PAYLOAD_RETENTION_DAYS') ??
        180,
    );

    const safeDays =
      Number.isFinite(retentionDays) && retentionDays > 0 ? retentionDays : 180;
    return new Date(Date.now() + safeDays * 24 * 60 * 60 * 1000);
  }

  private normalizeStoredStatus(
    status: string | null | undefined,
  ): KycCheckStatus {
    const normalized = status?.trim().toLowerCase();

    if (
      normalized === 'unverified' ||
      normalized === 'pending' ||
      normalized === 'verified' ||
      normalized === 'failed'
    ) {
      return normalized;
    }

    if (normalized === 'success') {
      return 'verified';
    }

    if (normalized === 'error' || normalized === 'rejected') {
      return 'failed';
    }

    return 'unverified';
  }

  private normalizeStatusInput(input?: string): KycCheckStatus | undefined {
    if (!input?.trim()) {
      return undefined;
    }

    const normalized = input.trim().toLowerCase();
    if (
      normalized === 'unverified' ||
      normalized === 'pending' ||
      normalized === 'verified' ||
      normalized === 'failed'
    ) {
      return normalized;
    }

    throw new BadRequestException(
      'Invalid check status filter. Use one of: unverified, pending, verified, failed',
    );
  }

  private normalizeCheckTypeInput(input?: string): KycCheckType | undefined {
    if (!input?.trim()) {
      return undefined;
    }

    const normalized = input.trim().toLowerCase().replace(/-/g, '_');

    if (normalized === 'nin_face') {
      return 'nin_face';
    }
    if (normalized === 'phone') {
      return 'phone';
    }

    throw new BadRequestException(
      'Invalid check type filter. Use: nin_face or phone',
    );
  }

  private humanizeCheckType(checkType: string): string {
    if (checkType === 'nin_face') {
      return 'NIN + Face';
    }
    return 'Phone';
  }

  private readString(value: unknown): string | null {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }

    return null;
  }

  private readNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private readBoolean(value: unknown): boolean | null {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true') {
        return true;
      }
      if (normalized === 'false') {
        return false;
      }
    }

    return null;
  }

  private readObject(value: unknown): Record<string, unknown> | null {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return null;
  }

  private toJsonValue(value: unknown): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'bigint') {
      return value.toString();
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.toJsonValue(item));
    }

    if (typeof value === 'object') {
      return Object.entries(value as Record<string, unknown>).reduce<
        Record<string, unknown>
      >((accumulator, [key, item]) => {
        accumulator[key] = this.toJsonValue(item);
        return accumulator;
      }, {});
    }

    return value;
  }

  private maskNin(nin: string): string {
    const trimmed = nin.trim();
    if (!trimmed) {
      return '***';
    }
    if (trimmed.length <= 4) {
      return `***${trimmed}`;
    }
    return `${'*'.repeat(Math.max(trimmed.length - 4, 3))}${trimmed.slice(-4)}`;
  }

  private maskPhone(phone: string): string {
    const trimmed = phone.trim();
    if (!trimmed) {
      return '***';
    }
    if (trimmed.length <= 4) {
      return `***${trimmed}`;
    }
    return `${trimmed.slice(0, 3)}${'*'.repeat(Math.max(trimmed.length - 5, 3))}${trimmed.slice(-2)}`;
  }

  private toGraphqlKycStatus(
    profile: PrismaProviderKycProfile,
  ): ProviderKycStatus {
    return {
      id: profile.id,
      providerId: profile.providerId,
      overallStatus: profile.overallStatus,
      kycLevel: profile.kycLevel,
      ninStatus: profile.ninStatus,
      phoneStatus: profile.phoneStatus,
      faceStatus: profile.faceStatus,
      ninVerifiedAt: profile.ninVerifiedAt ?? undefined,
      phoneVerifiedAt: profile.phoneVerifiedAt ?? undefined,
      faceVerifiedAt: profile.faceVerifiedAt ?? undefined,
      faceConfidence: profile.faceConfidence
        ? Number(profile.faceConfidence)
        : undefined,
      maskedNin: profile.maskedNin ?? undefined,
      maskedPhone: profile.maskedPhone ?? undefined,
      failureSummary: profile.failureSummary ?? undefined,
      lastVendorSyncAt: profile.lastVendorSyncAt ?? undefined,
      lastCheckAt: profile.lastCheckAt ?? undefined,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  private toGraphqlKycCheck(check: PrismaProviderKycCheck): ProviderKycCheck {
    return {
      id: check.id,
      providerId: check.providerId,
      profileId: check.profileId ?? undefined,
      checkType: check.checkType,
      status: check.status,
      vendor: check.vendor,
      vendorReference: check.vendorReference ?? undefined,
      responseCode: check.responseCode ?? undefined,
      confidence: check.confidence ? Number(check.confidence) : undefined,
      message: check.message ?? undefined,
      maskedIdentifier: check.maskedIdentifier ?? undefined,
      normalizedData: check.normalizedData as
        | Record<string, unknown>
        | undefined,
      expiresAt: check.expiresAt ?? undefined,
      verifiedAt: check.verifiedAt ?? undefined,
      failedAt: check.failedAt ?? undefined,
      initiatedByProfileId: check.initiatedByProfileId ?? undefined,
      createdAt: check.createdAt,
      updatedAt: check.updatedAt,
    };
  }
}
