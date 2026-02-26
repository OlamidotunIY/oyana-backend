import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Headers,
  Post,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { KycService } from './kyc.service';

type RequestWithRawBody = Request & {
  rawBody?: Buffer;
};

@Controller('kyc/prembly')
export class KycController {
  constructor(
    private readonly kycService: KycService,
    private readonly configService: ConfigService,
  ) {}

  @Post('webhook')
  async premblyWebhook(
    @Req() req: RequestWithRawBody,
    @Body() payload: Record<string, unknown>,
    @Headers('x-prembly-signature') signature?: string,
  ): Promise<{ received: true }> {
    const rawBody = req.rawBody
      ? req.rawBody.toString('utf8')
      : JSON.stringify(payload ?? {});
    this.assertAllowlistedIp(req);

    const signatureRequired =
      this.configService.get<string>('PREMBLY_WEBHOOK_SECRET')?.trim().length;

    if (signatureRequired && !signature) {
      throw new BadRequestException('Missing Prembly webhook signature');
    }

    await this.kycService.handlePremblyWebhook(payload, rawBody, signature);

    return { received: true };
  }

  private assertAllowlistedIp(req: RequestWithRawBody): void {
    const configured = this.configService
      .get<string>('PREMBLY_WEBHOOK_IP_ALLOWLIST')
      ?.split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (!configured?.length) {
      return;
    }

    const forwarded = req.headers['x-forwarded-for'];
    const forwardedFirst = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const forwardedIp =
      typeof forwardedFirst === 'string' ? forwardedFirst.split(',')[0]?.trim() : undefined;
    const requestIp = forwardedIp || req.ip || req.socket?.remoteAddress;

    if (!requestIp || !configured.includes(requestIp)) {
      throw new ForbiddenException('Prembly webhook IP is not allowlisted');
    }
  }
}
