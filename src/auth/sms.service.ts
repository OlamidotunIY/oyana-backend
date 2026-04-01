import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';

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

    if (provider === 'smarthive') {
      const apiKey = this.configService.get<string>(
        'SMARTHIVE_SMS_API_KEY',
        '',
      );
      const sender = this.configService.get<string>(
        'SMARTHIVE_SMS_SENDER_ID',
        'Oyana',
      );

      if (!apiKey) {
        throw new BadRequestException(
          'Smarthive SMS is not configured. Add SMARTHIVE_SMS_API_KEY or switch SMS_PROVIDER to console.',
        );
      }

      const res = await fetch('https://api.smarthivesms.com/api/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          sender,
          recipients: phoneE164,
          msg: message,
          type: 1,
          route: 'TRX',
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new BadRequestException(
          `Smarthive SMS failed (${res.status}): ${text}`,
        );
      }

      const body = (await res.json()) as { status?: string };
      if (body?.status !== 'ok') {
        throw new BadRequestException(
          `Smarthive SMS rejected: ${JSON.stringify(body)}`,
        );
      }

      return;
    }

    if (provider === 'twilio') {
      const accountSid = this.configService.get<string>(
        'SMS_TWILIO_ACCOUNT_SID',
        '',
      );
      const authToken = this.configService.get<string>(
        'SMS_TWILIO_AUTH_TOKEN',
        '',
      );
      const messagingServiceSid = this.configService.get<string>(
        'SMS_TWILIO_MESSAGING_SERVICE_SID',
        '',
      );
      const fromNumber = this.configService.get<string>(
        'SMS_TWILIO_FROM_NUMBER',
        '',
      );

      if (!accountSid || !authToken) {
        throw new BadRequestException(
          'SMS provider is not configured. Add SMS_TWILIO_ACCOUNT_SID and SMS_TWILIO_AUTH_TOKEN or switch SMS_PROVIDER to console.',
        );
      }

      if (!messagingServiceSid && !fromNumber) {
        throw new BadRequestException(
          'Twilio SMS requires SMS_TWILIO_MESSAGING_SERVICE_SID or SMS_TWILIO_FROM_NUMBER.',
        );
      }

      const client = twilio(accountSid, authToken);

      await client.messages.create({
        to: phoneE164,
        body: message,
        ...(messagingServiceSid
          ? { messagingServiceSid }
          : { from: fromNumber }),
      });

      return;
    }

    throw new BadRequestException(`Unsupported SMS provider: ${provider}`);
  }
}
