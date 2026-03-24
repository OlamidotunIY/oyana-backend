import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { WalletService } from './wallet.service';

type RequestWithRawBody = Request & {
  rawBody?: Buffer;
};

@Controller('wallet/paystack')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post('webhook')
  async paystackWebhook(
    @Req() req: RequestWithRawBody,
    @Body() payload: Record<string, unknown>,
    @Headers('x-paystack-signature') signature?: string,
  ): Promise<{ received: true }> {
    const rawBody = req.rawBody
      ? req.rawBody.toString('utf8')
      : JSON.stringify(payload ?? {});

    if (!signature) {
      throw new BadRequestException('Missing Paystack signature');
    }

    await this.walletService.handlePaystackWebhookEvent(
      payload,
      rawBody,
      signature,
    );

    return { received: true };
  }
}
