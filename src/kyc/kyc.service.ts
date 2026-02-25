import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, ProviderKycCase, Vehicle as PrismaVehicle } from '@prisma/client';
import axios, { AxiosError, AxiosInstance } from 'axios';
import { createHash } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import {
  CreateVehicleDto,
  KYCCase,
  KYCCaseStatus,
  KYCDocument,
  NINVerification,
  NINVerificationStatus,
  UploadKYCDocumentDto,
  UserType,
  VerifyNINDto,
  Vehicle,
  VehicleStatus,
} from '../graphql';

type PremblyVerificationResult = {
  sessionId: string;
  verificationUrl: string;
  message?: string;
  rawResponse: unknown;
};

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);
  private readonly premblyClient: AxiosInstance;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.premblyClient = axios.create({
      baseURL:
        this.configService.get<string>('PREMBLY_WIDGET_BASE_URL')?.trim() ||
        this.configService.get<string>('PREMBLY_BASE_URL')?.trim() ||
        'https://backend.prembly.com',
      timeout: Number(this.configService.get('PREMBLY_REQUEST_TIMEOUT_MS') ?? 15000),
    });
  }

  async getKycCases(profileId: string): Promise<KYCCase[]> {
    const providerId = await this.resolveProviderIdForProfile(profileId);
    if (!providerId) {
      return [];
    }

    const kycCases = await this.prisma.runWithRetry('KycService.getKycCases', () =>
      this.prisma.providerKycCase.findMany({
        where: {
          providerId,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      }),
    );

    return kycCases.map((kycCase) => this.toGraphqlKycCase(kycCase));
  }

  async getKycCase(profileId: string, id: string): Promise<KYCCase | null> {
    const providerId = await this.resolveProviderIdForProfile(profileId);
    if (!providerId) {
      return null;
    }

    const kycCase = await this.prisma.runWithRetry('KycService.getKycCase', () =>
      this.prisma.providerKycCase.findFirst({
        where: {
          id,
          providerId,
        },
      }),
    );

    if (!kycCase) {
      return null;
    }

    return this.toGraphqlKycCase(kycCase);
  }

  async createKycCase(profileId: string, providerIdArg?: string): Promise<KYCCase> {
    const providerId = await this.requireAuthorizedProviderId(profileId, providerIdArg);
    const profile = await this.requireProfile(profileId);

    const existing = await this.prisma.runWithRetry(
      'KycService.createKycCase.findExisting',
      () =>
        this.prisma.providerKycCase.findFirst({
          where: {
            providerId,
            status: {
              in: ['draft', 'pending', 'submitted', 'needs_more_info'],
            },
          },
          orderBy: {
            updatedAt: 'desc',
          },
        }),
    );

    if (existing) {
      return this.toGraphqlKycCase(existing);
    }

    const created = await this.prisma.runWithRetry('KycService.createKycCase.create', () =>
      this.prisma.providerKycCase.create({
        data: {
          providerId,
          status: 'draft',
          phoneVerified: profile.phoneVerified,
          kycLevel: profile.phoneVerified ? 1 : 0,
        },
      }),
    );

    return this.toGraphqlKycCase(created);
  }

  async submitKycCase(profileId: string, id: string): Promise<KYCCase> {
    const providerId = await this.requireAuthorizedProviderId(profileId);
    await this.requireOwnedKycCase(providerId, id);

    const updated = await this.prisma.runWithRetry('KycService.submitKycCase', () =>
      this.prisma.providerKycCase.update({
        where: {
          id,
        },
        data: {
          status: 'submitted',
          submittedAt: new Date(),
          lastVerificationAttempt: new Date(),
        },
      }),
    );

    return this.toGraphqlKycCase(updated);
  }

  async reviewKycCase(
    profileId: string,
    id: string,
    approved: boolean,
  ): Promise<KYCCase> {
    const role = await this.requireUserRole(profileId);

    if (role !== UserType.ADMIN) {
      const providerId = await this.requireAuthorizedProviderId(profileId);
      await this.requireOwnedKycCase(providerId, id);
    } else {
      const existingCase = await this.prisma.runWithRetry(
        'KycService.reviewKycCase.adminFind',
        () =>
          this.prisma.providerKycCase.findUnique({
            where: {
              id,
            },
            select: {
              id: true,
            },
          }),
      );

      if (!existingCase) {
        throw new NotFoundException('KYC case not found');
      }
    }

    const updated = await this.prisma.runWithRetry('KycService.reviewKycCase', () =>
      this.prisma.providerKycCase.update({
        where: {
          id,
        },
        data: {
          status: approved ? 'approved' : 'rejected',
          reviewedBy: profileId,
          reviewedAt: new Date(),
          rejectionReason: approved ? null : 'Rejected during KYC review',
          kycLevel: approved ? 3 : undefined,
          lastVerificationAttempt: new Date(),
        },
      }),
    );

    return this.toGraphqlKycCase(updated);
  }

  async uploadKycDocument(
    profileId: string,
    input: UploadKYCDocumentDto,
  ): Promise<KYCDocument> {
    const providerId = await this.requireAuthorizedProviderId(profileId);
    const kycCase = await this.requireOwnedKycCase(providerId, input.kycCaseId);

    const normalizedDocType = input.docType.trim().toLowerCase();
    const normalizedBucket = input.storageBucket.trim();
    const normalizedPath = input.storagePath.trim();

    if (!normalizedDocType || !normalizedBucket || !normalizedPath) {
      throw new BadRequestException('docType, storageBucket, and storagePath are required');
    }

    try {
      const document = await this.prisma.runWithRetry('KycService.uploadKycDocument', () =>
        this.prisma.$transaction(async (tx) => {
          const createdDocument = await tx.kycDocument.create({
            data: {
              kycCaseId: kycCase.id,
              docType: normalizedDocType,
              storageBucket: normalizedBucket,
              storagePath: normalizedPath,
              mimeType: input.mimeType?.trim() || undefined,
              uploadedBy: input.uploadedBy ?? profileId,
              status: 'uploaded',
            },
          });

          const nextKycLevel = this.resolveKycLevel({
            ...kycCase,
            documentsVerified: true,
          });

          await tx.providerKycCase.update({
            where: { id: kycCase.id },
            data: {
              documentsVerified: true,
              kycLevel: nextKycLevel,
              lastVerificationAttempt: new Date(),
            },
          });

          return createdDocument;
        }),
      );

      return this.toGraphqlKycDocument(document);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new BadRequestException('This document path has already been uploaded');
      }

      throw error;
    }
  }

  async initiateNinVerification(
    profileId: string,
    input: VerifyNINDto,
  ): Promise<NINVerification> {
    const profile = await this.requireProfile(profileId);
    const providerId = await this.requireAuthorizedProviderId(profileId, input.providerId);
    const kycCase = await this.getOrCreateKycCaseForProvider(
      providerId,
      profileId,
      profile,
      input.kycCaseId,
    );

    const firstName = profile.firstName?.trim();
    const lastName = profile.lastName?.trim();

    if (!firstName || !lastName) {
      throw new BadRequestException(
        'Profile first and last name are required before starting KYC verification',
      );
    }

    const verification = await this.initiatePremblyWidgetSession({
      firstName,
      lastName,
      email: profile.email,
    });

    const ninHash = this.hashNin(`prembly-session:${verification.sessionId}`);
    const status = NINVerificationStatus.PENDING;

    const record = await this.prisma.runWithRetry(
      'KycService.initiateNinVerification',
      () =>
        this.prisma.$transaction(async (tx) => {
          const createdVerification = await tx.ninVerification.create({
            data: {
              kycCaseId: kycCase.id,
              providerId,
              ninHash,
              status,
              vendor: 'prembly',
              vendorReference: verification.sessionId,
              firstName,
              lastName,
              dateOfBirth: null,
              requestedAt: new Date(),
              verifiedAt: null,
              failureReason: null,
              rawResponse:
                this.toJsonValue({
                  ...this.toObject(verification.rawResponse),
                  verificationUrl: verification.verificationUrl,
                }) as unknown as Prisma.InputJsonValue,
            },
          });

          await tx.providerKycCase.update({
            where: {
              id: kycCase.id,
            },
            data: {
              lastVerificationAttempt: new Date(),
              status: 'submitted',
              submittedAt: kycCase.submittedAt ?? new Date(),
            },
          });

          return createdVerification;
        }),
    );

    return this.toGraphqlNinVerification(record);
  }

  async createVehicle(profileId: string, input: CreateVehicleDto): Promise<Vehicle> {
    const providerId = await this.requireAuthorizedProviderId(profileId, input.providerId);
    const normalizedPlateNumber = input.plateNumber?.trim().toUpperCase() || undefined;

    try {
      const vehicle = await this.prisma.runWithRetry('KycService.createVehicle', () =>
        this.prisma.vehicle.create({
          data: {
            providerId,
            category: input.category,
            plateNumber: normalizedPlateNumber,
            make: input.make?.trim() || undefined,
            model: input.model?.trim() || undefined,
            color: input.color?.trim() || undefined,
            capacityKg: input.capacityKg,
            capacityVolumeCm3: this.parseOptionalBigInt(input.capacityVolumeCm3),
            status: VehicleStatus.ACTIVE,
          },
        }),
      );

      return this.toGraphqlVehicle(vehicle);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new BadRequestException('A vehicle with this plate number already exists');
      }

      throw error;
    }
  }

  async getVehicles(profileId: string): Promise<Vehicle[]> {
    const providerId = await this.requireAuthorizedProviderId(profileId);
    const vehicles = await this.prisma.runWithRetry('KycService.getVehicles', () =>
      this.prisma.vehicle.findMany({
        where: {
          providerId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    );

    return vehicles.map((vehicle) => this.toGraphqlVehicle(vehicle));
  }

  private async initiatePremblyWidgetSession(input: {
    firstName: string;
    lastName: string;
    email: string;
  }): Promise<PremblyVerificationResult> {
    const widgetId =
      this.configService.get<string>('PREMBLY_WIDGET_ID')?.trim() ||
      this.configService.get<string>('PREMBLY_APP_ID')?.trim();
    const widgetKey =
      this.configService.get<string>('PREMBLY_WIDGET_KEY')?.trim() ||
      this.configService.get<string>('PREMBLY_API_KEY')?.trim();
    const endpoint =
      this.configService.get<string>('PREMBLY_WIDGET_INITIATE_ENDPOINT')?.trim() ||
      '/api/v1/checker-widget/sdk/sessions/initiate/';

    if (!widgetId || !widgetKey) {
      throw new BadRequestException(
        'Prembly widget is unavailable. Configure PREMBLY_WIDGET_ID/PREMBLY_WIDGET_KEY (or PREMBLY_APP_ID/PREMBLY_API_KEY)',
      );
    }

    try {
      const requestPayload = {
        first_name: input.firstName,
        last_name: input.lastName,
        email: input.email,
        widget_id: widgetId,
        widget_key: widgetKey,
      };

      const { data } = await this.premblyClient.post(endpoint, requestPayload, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });

      const normalizedPayload = this.toObject(data);
      const dataObject = this.toObject(normalizedPayload.data);
      const sessionObject = this.toObject(dataObject.session);
      const apiMessage =
        this.readString(normalizedPayload.message) ??
        undefined;
      const succeeded = this.toBoolean(normalizedPayload.status);

      if (!succeeded) {
        throw new BadRequestException(apiMessage ?? 'Unable to initiate Prembly verification');
      }

      const sessionId =
        this.readString(sessionObject.session_id) ??
        this.readString(sessionObject.id);

      if (!sessionId) {
        throw new BadRequestException('Prembly session did not return a session_id');
      }

      const verificationUrl = this.buildPremblyVerificationUrl(sessionId);

      return {
        sessionId,
        verificationUrl,
        message: apiMessage ?? 'Session initiated successfully',
        rawResponse: data,
      };
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      if (error instanceof BadRequestException) {
        throw error;
      }

      const message =
        axiosError.response?.data?.message ??
        axiosError.message ??
        'Prembly session initiation failed';
      this.logger.warn(`Prembly widget initiation failed: ${message}`);
      throw new BadRequestException(message);
    }
  }

  private buildPremblyVerificationUrl(sessionId: string): string {
    const configuredBase =
      this.configService.get<string>('PREMBLY_WIDGET_PUBLIC_URL')?.trim() ||
      'https://dv7wajvnnyl16.cloudfront.net/';
    const baseUrl = configuredBase.endsWith('/')
      ? configuredBase
      : `${configuredBase}/`;

    return `${baseUrl}?session=${encodeURIComponent(sessionId)}`;
  }

  private resolveKycLevel(input: {
    phoneVerified: boolean;
    ninVerified: boolean;
    documentsVerified: boolean;
    vehicleVerified: boolean;
  }): number {
    if (
      input.phoneVerified &&
      input.ninVerified &&
      input.documentsVerified &&
      input.vehicleVerified
    ) {
      return 3;
    }

    if (input.ninVerified) {
      return 2;
    }

    if (input.phoneVerified || input.documentsVerified || input.vehicleVerified) {
      return 1;
    }

    return 0;
  }

  private hashNin(nin: string): string {
    return createHash('sha256').update(nin).digest('hex');
  }

  private toBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return ['true', 'yes', '1', 'success'].includes(value.trim().toLowerCase());
    }

    if (typeof value === 'number') {
      return value === 1;
    }

    return false;
  }

  private readString(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }

  private toObject(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return value as Record<string, unknown>;
  }

  private parseOptionalBigInt(value?: bigint): bigint | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }

    try {
      return BigInt(value);
    } catch {
      throw new BadRequestException('capacityVolumeCm3 must be a valid integer value');
    }
  }

  private async requireAuthorizedProviderId(
    profileId: string,
    providerIdArg?: string,
  ): Promise<string> {
    const providerIdFromInput = providerIdArg?.trim();
    if (providerIdFromInput) {
      return this.assertProviderAccess(profileId, providerIdFromInput);
    }

    const resolvedProviderId = await this.resolveProviderIdForProfile(profileId);
    if (resolvedProviderId) {
      return this.assertProviderAccess(profileId, resolvedProviderId);
    }

    const provisionedProviderId = await this.provisionProviderAccount(profileId);
    return this.assertProviderAccess(profileId, provisionedProviderId);
  }

  private async assertProviderAccess(
    profileId: string,
    providerId: string,
  ): Promise<string> {
    const authorized = await this.prisma.runWithRetry(
      'KycService.assertProviderAccess',
      () =>
        this.prisma.provider.findFirst({
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
          select: {
            id: true,
          },
        }),
    );

    if (!authorized) {
      throw new ForbiddenException('You do not have access to this provider');
    }

    return authorized.id;
  }

  private async provisionProviderAccount(profileId: string): Promise<string> {
    const profile = await this.requireProfile(profileId);
    const defaultBusinessName = this.buildDefaultProviderBusinessName(profile);

    try {
      const provider = await this.prisma.runWithRetry(
        'KycService.provisionProviderAccount.createProvider',
        () =>
          this.prisma.$transaction(async (tx) => {
            const createdProvider = await tx.provider.create({
              data: {
                businessName: defaultBusinessName,
                profileId,
                status: 'pending',
              },
              select: {
                id: true,
              },
            });

            await tx.providerMember.create({
              data: {
                providerId: createdProvider.id,
                profileId,
                role: 'owner',
                status: 'active',
              },
            });

            return createdProvider;
          }),
      );

      this.logger.log(
        `Auto-provisioned provider account ${provider.id} for profile ${profileId}`,
      );
      return provider.id;
    } catch (error) {
      if (!this.isUniqueConstraintError(error)) {
        throw error;
      }
    }

    const existingProviderId = await this.resolveProviderIdForProfile(profileId);
    if (!existingProviderId) {
      throw new ForbiddenException('Unable to create provider profile for this user');
    }

    await this.prisma.runWithRetry(
      'KycService.provisionProviderAccount.ensureProviderMember',
      () =>
        this.prisma.providerMember.upsert({
          where: {
            providerId_profileId: {
              providerId: existingProviderId,
              profileId,
            },
          },
          update: {
            role: 'owner',
            status: 'active',
          },
          create: {
            providerId: existingProviderId,
            profileId,
            role: 'owner',
            status: 'active',
          },
        }),
    );

    this.logger.log(
      `Attached profile ${profileId} to existing provider ${existingProviderId}`,
    );
    return existingProviderId;
  }

  private buildDefaultProviderBusinessName(profile: {
    email: string;
    firstName: string | null;
    lastName: string | null;
  }): string {
    const fullName = [profile.firstName?.trim(), profile.lastName?.trim()]
      .filter((value): value is string => Boolean(value))
      .join(' ');

    if (fullName) {
      return `${fullName} Logistics`;
    }

    const emailPrefix = profile.email.split('@')[0]?.trim();
    if (emailPrefix) {
      return `${emailPrefix} Logistics`;
    }

    return 'Oyana Provider';
  }

  private async resolveProviderIdForProfile(profileId: string): Promise<string | null> {
    const provider = await this.prisma.runWithRetry(
      'KycService.resolveProviderIdForProfile.provider',
      () =>
        this.prisma.provider.findFirst({
          where: { profileId },
          select: { id: true },
        }),
    );

    if (provider?.id) {
      return provider.id;
    }

    const providerMember = await this.prisma.runWithRetry(
      'KycService.resolveProviderIdForProfile.providerMember',
      () =>
        this.prisma.providerMember.findFirst({
          where: {
            profileId,
            status: 'active',
          },
          orderBy: {
            createdAt: 'asc',
          },
          select: {
            providerId: true,
          },
        }),
    );

    return providerMember?.providerId ?? null;
  }

  private async requireProfile(profileId: string) {
    const profile = await this.prisma.runWithRetry('KycService.requireProfile', () =>
      this.prisma.profile.findUnique({
        where: {
          id: profileId,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phoneVerified: true,
        },
      }),
    );

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return profile;
  }

  private async requireUserRole(profileId: string): Promise<UserType> {
    const profile = await this.prisma.runWithRetry('KycService.requireUserRole', () =>
      this.prisma.profile.findUnique({
        where: {
          id: profileId,
        },
        select: {
          userType: true,
        },
      }),
    );

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return profile.userType as UserType;
  }

  private async getOrCreateKycCaseForProvider(
    providerId: string,
    profileId: string,
    profile: {
      phoneVerified: boolean;
    },
    preferredKycCaseId?: string,
  ): Promise<ProviderKycCase> {
    if (preferredKycCaseId?.trim()) {
      return this.requireOwnedKycCase(providerId, preferredKycCaseId.trim());
    }

    const existingCase = await this.prisma.runWithRetry(
      'KycService.getOrCreateKycCaseForProvider.findExisting',
      () =>
        this.prisma.providerKycCase.findFirst({
          where: {
            providerId,
            status: {
              in: ['draft', 'pending', 'submitted', 'needs_more_info'],
            },
          },
          orderBy: {
            updatedAt: 'desc',
          },
        }),
    );

    if (existingCase) {
      return existingCase;
    }

    return this.prisma.runWithRetry(
      'KycService.getOrCreateKycCaseForProvider.create',
      () =>
        this.prisma.providerKycCase.create({
          data: {
            providerId,
            status: 'draft',
            phoneVerified: profile.phoneVerified,
            kycLevel: profile.phoneVerified ? 1 : 0,
          },
        }),
    );
  }

  private async requireOwnedKycCase(
    providerId: string,
    kycCaseId: string,
  ): Promise<ProviderKycCase> {
    const kycCase = await this.prisma.runWithRetry('KycService.requireOwnedKycCase', () =>
      this.prisma.providerKycCase.findFirst({
        where: {
          id: kycCaseId,
          providerId,
        },
      }),
    );

    if (!kycCase) {
      throw new NotFoundException('KYC case not found');
    }

    return kycCase;
  }

  private normalizeKycCaseStatus(status: string): KYCCaseStatus {
    const normalizedStatus = status.toLowerCase();

    if (normalizedStatus === 'pending') {
      return KYCCaseStatus.DRAFT;
    }

    if (
      Object.values(KYCCaseStatus).includes(normalizedStatus as KYCCaseStatus)
    ) {
      return normalizedStatus as KYCCaseStatus;
    }

    return KYCCaseStatus.DRAFT;
  }

  private normalizeNinStatus(status: string): NINVerificationStatus {
    const normalized = status.toLowerCase();

    if (
      Object.values(NINVerificationStatus).includes(
        normalized as NINVerificationStatus,
      )
    ) {
      return normalized as NINVerificationStatus;
    }

    return NINVerificationStatus.PENDING;
  }

  private normalizeVehicleStatus(status: string): VehicleStatus {
    const normalized = status.toLowerCase();

    if (Object.values(VehicleStatus).includes(normalized as VehicleStatus)) {
      return normalized as VehicleStatus;
    }

    return VehicleStatus.ACTIVE;
  }

  private toGraphqlKycCase(kycCase: ProviderKycCase): KYCCase {
    return {
      id: kycCase.id,
      providerId: kycCase.providerId,
      status: this.normalizeKycCaseStatus(kycCase.status),
      kycLevel: kycCase.kycLevel,
      ninVerified: kycCase.ninVerified,
      phoneVerified: kycCase.phoneVerified,
      faceVerified: kycCase.faceVerified,
      vehicleVerified: kycCase.vehicleVerified,
      documentsVerified: kycCase.documentsVerified,
      submittedAt: kycCase.submittedAt ?? undefined,
      rejectionReason: kycCase.rejectionReason ?? undefined,
      reviewedBy: kycCase.reviewedBy ?? undefined,
      reviewedAt: kycCase.reviewedAt ?? undefined,
      lastVerificationAttempt: kycCase.lastVerificationAttempt ?? undefined,
      createdAt: kycCase.createdAt,
      updatedAt: kycCase.updatedAt,
    };
  }

  private toGraphqlKycDocument(document: {
    id: string;
    kycCaseId: string;
    docType: string;
    storageBucket: string;
    storagePath: string;
    mimeType: string | null;
    status: string;
    uploadedBy: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): KYCDocument {
    return {
      id: document.id,
      kycCaseId: document.kycCaseId,
      docType: document.docType,
      storageBucket: document.storageBucket,
      storagePath: document.storagePath,
      mimeType: document.mimeType ?? undefined,
      status: document.status,
      uploadedBy: document.uploadedBy ?? undefined,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }

  private toGraphqlNinVerification(verification: {
    id: string;
    kycCaseId: string;
    providerId: string;
    ninHash: string;
    firstName: string | null;
    lastName: string | null;
    dateOfBirth: Date | null;
    vendor: string | null;
    vendorReference: string | null;
    status: string;
    requestedAt: Date | null;
    verifiedAt: Date | null;
    failureReason: string | null;
    rawResponse: Prisma.JsonValue | null;
    createdAt: Date;
    updatedAt: Date;
  }): NINVerification {
    return {
      id: verification.id,
      kycCaseId: verification.kycCaseId,
      providerId: verification.providerId,
      ninHash: verification.ninHash,
      firstName: verification.firstName ?? undefined,
      lastName: verification.lastName ?? undefined,
      dateOfBirth: verification.dateOfBirth ?? undefined,
      vendor: verification.vendor ?? undefined,
      vendorReference: verification.vendorReference ?? undefined,
      status: this.normalizeNinStatus(verification.status),
      requestedAt: verification.requestedAt ?? undefined,
      verifiedAt: verification.verifiedAt ?? undefined,
      failureReason: verification.failureReason ?? undefined,
      rawResponse: verification.rawResponse ?? undefined,
      createdAt: verification.createdAt,
      updatedAt: verification.updatedAt,
    };
  }

  private toGraphqlVehicle(vehicle: PrismaVehicle): Vehicle {
    return {
      id: vehicle.id,
      providerId: vehicle.providerId,
      category: vehicle.category as Vehicle['category'],
      plateNumber: vehicle.plateNumber ?? undefined,
      make: vehicle.make ?? undefined,
      model: vehicle.model ?? undefined,
      color: vehicle.color ?? undefined,
      capacityKg: vehicle.capacityKg ?? undefined,
      capacityVolumeCm3: vehicle.capacityVolumeCm3 ?? undefined,
      status: this.normalizeVehicleStatus(vehicle.status),
      createdAt: vehicle.createdAt,
      updatedAt: vehicle.updatedAt,
    };
  }

  private isUniqueConstraintError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const candidate = error as { code?: string };
    return candidate.code === 'P2002';
  }

  private toJsonValue(value: unknown): unknown {
    if (typeof value === 'bigint') {
      return value.toString();
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.toJsonValue(item));
    }

    if (value && typeof value === 'object') {
      return Object.entries(value as Record<string, unknown>).reduce<
        Record<string, unknown>
      >((accumulator, [key, item]) => {
        accumulator[key] = this.toJsonValue(item);
        return accumulator;
      }, {});
    }

    return value;
  }
}
