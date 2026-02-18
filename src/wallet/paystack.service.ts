import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { createHmac, timingSafeEqual } from 'crypto';

type PaystackResponse<T> = {
  status: boolean;
  message: string;
  data: T;
};

type PaystackInitializeTransactionInput = {
  email: string;
  amountMinor: bigint;
  reference: string;
  currency: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
};

type PaystackChargeAuthorizationInput = {
  email: string;
  amountMinor: bigint;
  reference: string;
  authorizationCode: string;
  currency: string;
  metadata?: Record<string, unknown>;
};

type PaystackResolveAccountInput = {
  accountNumber: string;
  bankCode: string;
};

type PaystackCreateRecipientInput = {
  accountName: string;
  accountNumber: string;
  bankCode: string;
  currency: string;
};

type PaystackTransferInput = {
  amountMinor: bigint;
  reference: string;
  recipientCode: string;
  reason?: string;
  currency: string;
};

export type PaystackInitializeTransactionData = {
  authorization_url: string;
  access_code: string;
  reference: string;
};

export type PaystackAuthorizationData = {
  authorization_code?: string;
  bin?: string;
  last4?: string;
  exp_month?: string;
  exp_year?: string;
  channel?: string;
  card_type?: string;
  bank?: string;
  country_code?: string;
  brand?: string;
  reusable?: boolean;
  signature?: string;
};

export type PaystackVerifyTransactionData = {
  id?: number;
  status?: string;
  reference: string;
  amount?: number;
  currency?: string;
  paid_at?: string;
  customer?: {
    email?: string;
    customer_code?: string;
  };
  authorization?: PaystackAuthorizationData;
  metadata?: Record<string, unknown>;
};

export type PaystackBank = {
  name: string;
  code: string;
  slug?: string;
  longcode?: string;
  gateway?: string;
  pay_with_bank?: boolean;
  active?: boolean;
  country?: string;
  currency?: string;
};

export type PaystackResolveAccountData = {
  account_number: string;
  account_name: string;
  bank_id?: number;
};

export type PaystackRecipientData = {
  recipient_code: string;
  type?: string;
  details?: Record<string, unknown>;
};

export type PaystackTransferData = {
  id?: number;
  transfer_code?: string;
  reference: string;
  status?: string;
};

@Injectable()
export class PaystackService {
  private readonly logger = new Logger(PaystackService.name);
  private readonly httpClient: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    this.httpClient = axios.create({
      baseURL: 'https://api.paystack.co',
      timeout: Number(this.configService.get('PAYSTACK_REQUEST_TIMEOUT_MS') ?? 15000),
    });
  }

  async initializeTransaction(
    input: PaystackInitializeTransactionInput,
  ): Promise<PaystackInitializeTransactionData> {
    const response = await this.request<PaystackInitializeTransactionData>(
      {
        method: 'POST',
        url: '/transaction/initialize',
        data: {
          email: input.email,
          amount: Number(input.amountMinor),
          reference: input.reference,
          currency: input.currency,
          callback_url: input.callbackUrl,
          metadata: input.metadata,
        },
      },
      'Failed to initialize Paystack transaction',
    );

    return response;
  }

  async chargeAuthorization(
    input: PaystackChargeAuthorizationInput,
  ): Promise<PaystackVerifyTransactionData> {
    const response = await this.request<PaystackVerifyTransactionData>(
      {
        method: 'POST',
        url: '/transaction/charge_authorization',
        data: {
          email: input.email,
          amount: Number(input.amountMinor),
          reference: input.reference,
          authorization_code: input.authorizationCode,
          currency: input.currency,
          metadata: input.metadata,
        },
      },
      'Failed to charge authorization',
    );

    return response;
  }

  async verifyTransaction(reference: string): Promise<PaystackVerifyTransactionData> {
    const response = await this.request<PaystackVerifyTransactionData>(
      {
        method: 'GET',
        url: `/transaction/verify/${encodeURIComponent(reference)}`,
      },
      'Failed to verify transaction',
    );

    return response;
  }

  async getSupportedBanks(countryCode = 'NG'): Promise<PaystackBank[]> {
    const response = await this.request<PaystackBank[]>(
      {
        method: 'GET',
        url: '/bank',
        params: {
          country: countryCode,
          perPage: 500,
        },
      },
      'Failed to fetch supported banks',
    );

    return response;
  }

  async resolveBankAccount(
    input: PaystackResolveAccountInput,
  ): Promise<PaystackResolveAccountData> {
    const response = await this.request<PaystackResolveAccountData>(
      {
        method: 'GET',
        url: '/bank/resolve',
        params: {
          account_number: input.accountNumber,
          bank_code: input.bankCode,
        },
      },
      'Failed to resolve bank account',
    );

    return response;
  }

  async createTransferRecipient(
    input: PaystackCreateRecipientInput,
  ): Promise<PaystackRecipientData> {
    const response = await this.request<PaystackRecipientData>(
      {
        method: 'POST',
        url: '/transferrecipient',
        data: {
          type: 'nuban',
          name: input.accountName,
          account_number: input.accountNumber,
          bank_code: input.bankCode,
          currency: input.currency,
        },
      },
      'Failed to create transfer recipient',
    );

    return response;
  }

  async initiateTransfer(input: PaystackTransferInput): Promise<PaystackTransferData> {
    const response = await this.request<PaystackTransferData>(
      {
        method: 'POST',
        url: '/transfer',
        data: {
          source: 'balance',
          amount: Number(input.amountMinor),
          reference: input.reference,
          recipient: input.recipientCode,
          reason: input.reason,
          currency: input.currency,
        },
      },
      'Failed to initiate transfer',
    );

    return response;
  }

  verifyWebhookSignature(rawBody: string, signature?: string): boolean {
    if (!signature) {
      return false;
    }

    const hmac = createHmac('sha512', this.getSecretKey())
      .update(rawBody)
      .digest('hex');

    const expected = Buffer.from(hmac, 'utf8');
    const received = Buffer.from(signature, 'utf8');

    if (expected.length !== received.length) {
      return false;
    }

    return timingSafeEqual(expected, received);
  }

  private getSecretKey(): string {
    const secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');

    if (!secretKey) {
      throw new Error('PAYSTACK_SECRET_KEY is not configured');
    }

    return secretKey;
  }

  private async request<T>(
    config: AxiosRequestConfig,
    fallbackMessage: string,
  ): Promise<T> {
    try {
      const { data } = await this.httpClient.request<PaystackResponse<T>>({
        ...config,
        headers: {
          ...(config.headers ?? {}),
          Authorization: `Bearer ${this.getSecretKey()}`,
          'Content-Type': 'application/json',
        },
      });

      if (!data.status) {
        throw new BadRequestException(data.message || fallbackMessage);
      }

      return data.data;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      const axiosError = error as AxiosError<{
        message?: string;
        data?: { message?: string };
      }>;
      const paystackMessage =
        axiosError.response?.data?.message ?? axiosError.message ?? fallbackMessage;

      this.logger.warn(`${fallbackMessage}: ${paystackMessage}`);
      throw new BadRequestException(paystackMessage);
    }
  }
}
