import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosInstance } from 'axios';

export type PremblyCheckType =
  | 'nin_face'
  | 'phone'
  | 'vehicle_plate'
  | 'vehicle_vin'
  | 'status';

@Injectable()
export class PremblyClient {
  private readonly logger = new Logger(PremblyClient.name);
  private readonly client: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    const baseURL =
      this.configService.get<string>('PREMBLY_BASE_URL')?.trim() ||
      this.configService.get<string>('PREMBLY_WIDGET_BASE_URL')?.trim() ||
      'https://backend.prembly.com';

    const timeout = Number(
      this.configService.get<string>('PREMBLY_REQUEST_TIMEOUT_MS') ?? 15000,
    );

    this.client = axios.create({
      baseURL,
      timeout,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
  }

  async ninWithFace(input: {
    image: string;
    numberNin: string;
    dateOfBirth: string;
  }): Promise<Record<string, unknown>> {
    return this.postByType('nin_face', {
      image: input.image,
      number_nin: input.numberNin,
      date_of_birth: input.dateOfBirth,
    });
  }

  async verifyPhone(input: {
    phoneNumber: string;
  }): Promise<Record<string, unknown>> {
    return this.postByType('phone', {
      number: input.phoneNumber,
    });
  }

  async verifyPlate(input: {
    plateNumber: string;
  }): Promise<Record<string, unknown>> {
    return this.postByType('vehicle_plate', {
      vehicle_number: input.plateNumber,
    });
  }

  async verifyVin(input: { vin: string }): Promise<Record<string, unknown>> {
    return this.postByType('vehicle_vin', {
      vin: input.vin,
    });
  }

  async fetchStatus(input: {
    reference: string;
  }): Promise<Record<string, unknown>> {
    return this.postByType('status', {
      reference: input.reference,
    });
  }

  private resolveEndpoint(type: PremblyCheckType): string {
    const fromEnv = {
      nin_face: this.configService
        .get<string>('PREMBLY_NIN_FACE_ENDPOINT')
        ?.trim(),
      phone: this.configService.get<string>('PREMBLY_PHONE_ENDPOINT')?.trim(),
      vehicle_plate: this.configService
        .get<string>('PREMBLY_PLATE_ENDPOINT')
        ?.trim(),
      vehicle_vin: this.configService
        .get<string>('PREMBLY_VIN_ENDPOINT')
        ?.trim(),
      status: this.configService.get<string>('PREMBLY_STATUS_ENDPOINT')?.trim(),
    }[type];

    if (fromEnv) {
      return fromEnv;
    }

    const fallback: Record<PremblyCheckType, string | undefined> = {
      nin_face: '/api/v1/biometrics/merchant/data/verification/nin_face',
      phone:
        '/api/v1/biometrics/merchant/data/verification/basic_phone_number_1',
      vehicle_plate:
        '/api/v1/biometrics/merchant/data/verification/plate_number',
      vehicle_vin: undefined,
      status: undefined,
    };

    const endpoint = fallback[type];
    if (!endpoint) {
      throw new BadRequestException(
        `Prembly ${type} endpoint is not configured`,
      );
    }

    return endpoint;
  }

  private getHeaders(): Record<string, string> {
    const apiKey = this.configService.get<string>('PREMBLY_API_KEY')?.trim();
    const appId = this.configService.get<string>('PREMBLY_APP_ID')?.trim();

    if (!apiKey || !appId) {
      throw new BadRequestException(
        'Prembly credentials are not configured. Set PREMBLY_API_KEY and PREMBLY_APP_ID.',
      );
    }

    return {
      'X-Api-Key': apiKey,
      app_id: appId,
    };
  }

  private async postByType(
    type: PremblyCheckType,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const endpoint = this.resolveEndpoint(type);

    try {
      const response = await this.client.post(endpoint, payload, {
        headers: this.getHeaders(),
      });
      const data = response.data;

      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        this.logger.warn(`Prembly ${type} returned a non-object payload`);
        return {};
      }

      const body = data as Record<string, unknown>;
      const requestId = this.extractRequestId(response.headers);
      const reference = this.extractReference(body);

      this.logger.log(
        `Prembly ${type} request succeeded requestId=${requestId ?? 'n/a'} reference=${reference ?? 'n/a'} status=${response.status}`,
      );

      return body;
    } catch (error) {
      const axiosError = error as AxiosError<{
        message?: string;
        detail?: string;
      }>;
      const message =
        axiosError.response?.data?.detail ??
        axiosError.response?.data?.message ??
        axiosError.message ??
        'Prembly request failed';
      const requestId = this.extractRequestId(axiosError.response?.headers);
      const statusCode = axiosError.response?.status;

      this.logger.warn(
        `Prembly ${type} request failed requestId=${requestId ?? 'n/a'} status=${statusCode ?? 'n/a'} message=${message}`,
      );

      throw new BadRequestException(message);
    }
  }

  private extractRequestId(
    headers: Record<string, unknown> | undefined,
  ): string | undefined {
    if (!headers) {
      return undefined;
    }

    const candidates = [
      headers['x-request-id'],
      headers['x-correlation-id'],
      headers['request-id'],
    ];

    for (const candidate of candidates) {
      const value = Array.isArray(candidate) ? candidate[0] : candidate;
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }

    return undefined;
  }

  private extractReference(body: Record<string, unknown>): string | undefined {
    const verification = body.verification;
    if (
      verification &&
      typeof verification === 'object' &&
      !Array.isArray(verification)
    ) {
      const nested = (verification as Record<string, unknown>).reference;
      if (typeof nested === 'string' && nested.trim().length > 0) {
        return nested.trim();
      }
    }

    const topLevel = body.reference;
    if (typeof topLevel === 'string' && topLevel.trim().length > 0) {
      return topLevel.trim();
    }

    return undefined;
  }
}
