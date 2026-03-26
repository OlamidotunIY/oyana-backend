import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendOtpSms(phoneE164: string, code: string): Promise<void> {
    const provider = this.configService
      .get<string>('SMS_PROVIDER', 'console')
      .trim()
      .toLowerCase();
    const message = `Your Oyana verification code is ${code}. It expires in 10 minutes.`;

    if (provider === 'console') {
      this.logger.warn(`SMS OTP for ${phoneE164}: ${code}`);
      return;
    }

    if (provider === 'termii') {
      const apiKey = this.configService.get<string>('SMS_TERMII_API_KEY', '');
      const senderId = this.configService.get<string>(
        'SMS_TERMII_SENDER_ID',
        'Oyana',
      );
      const channel = this.configService.get<string>(
        'SMS_TERMII_CHANNEL',
        'generic',
      );
      const baseUrl = this.configService.get<string>(
        'SMS_TERMII_BASE_URL',
        'https://api.ng.termii.com/api',
      );

      if (!apiKey) {
        throw new BadRequestException(
          'SMS provider is not configured. Add SMS_TERMII_API_KEY or switch SMS_PROVIDER to console.',
        );
      }

      await axios.post(`${baseUrl}/sms/send`, {
        api_key: apiKey,
        to: phoneE164,
        from: senderId,
        sms: message,
        type: 'plain',
        channel,
      });

      return;
    }

    throw new BadRequestException(`Unsupported SMS provider: ${provider}`);
  }
}
