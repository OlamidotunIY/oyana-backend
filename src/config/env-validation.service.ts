import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type RuntimeRole = 'app' | 'worker';

@Injectable()
export class EnvValidationService implements OnModuleInit {
  private readonly logger = new Logger(EnvValidationService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const runtimeRole = this.resolveRuntimeRole();
    const missingRequired = this.collectMissingRequired(runtimeRole);
    const missingRecommended = this.collectMissingRecommended(runtimeRole);

    if (missingRecommended.length > 0) {
      this.logger.warn(
        `Recommended environment variables are missing for ${runtimeRole}: ${missingRecommended.join(', ')}`,
      );
    }

    if (missingRequired.length > 0) {
      throw new Error(
        `Missing required environment variables for ${runtimeRole}: ${missingRequired.join(', ')}`,
      );
    }

    this.logger.log(`Environment validation passed for ${runtimeRole}`);
  }

  private resolveRuntimeRole(): RuntimeRole {
    return process.env.RUNTIME_ROLE === 'worker' ? 'worker' : 'app';
  }

  private collectMissingRequired(runtimeRole: RuntimeRole): string[] {
    const required = new Set<string>(['DATABASE_URL', 'DIRECT_URL']);

    if (runtimeRole === 'app') {
      required.add('JWT_SECRET');
      required.add('SMTP_HOST');
      required.add('SMTP_USER');
      required.add('SMTP_PASS');
      required.add('PAYSTACK_SECRET_KEY');
      required.add('GOOGLE_MAPS_API_KEY');
    }

    const smsProvider = this.getTrimmed('SMS_PROVIDER')?.toLowerCase();
    if (runtimeRole === 'app' && smsProvider === 'twilio') {
      required.add('SMS_TWILIO_ACCOUNT_SID');
      required.add('SMS_TWILIO_AUTH_TOKEN');

      const hasMessagingService = Boolean(
        this.getTrimmed('SMS_TWILIO_MESSAGING_SERVICE_SID'),
      );
      const hasFromNumber = Boolean(this.getTrimmed('SMS_TWILIO_FROM_NUMBER'));

      if (!hasMessagingService && !hasFromNumber) {
        required.add(
          'SMS_TWILIO_MESSAGING_SERVICE_SID or SMS_TWILIO_FROM_NUMBER',
        );
      }
    }

    return Array.from(required).filter((key) => !this.isPresent(key));
  }

  private collectMissingRecommended(runtimeRole: RuntimeRole): string[] {
    const recommended = new Set<string>();

    if (runtimeRole === 'app') {
      recommended.add('GOOGLE_CLIENT_ID');
      recommended.add('GOOGLE_CLIENT_SECRET');
      recommended.add('GOOGLE_CLOUD_PROJECT_ID');
      recommended.add('GOOGLE_CLOUD_CLIENT_EMAIL');
      recommended.add('GOOGLE_CLOUD_PRIVATE_KEY');
      recommended.add('STORAGE_BUCKET_NAME');
    }

    return Array.from(recommended).filter((key) => !this.isPresent(key));
  }

  private isPresent(name: string): boolean {
    return Boolean(this.getTrimmed(name));
  }

  private getTrimmed(name: string): string | undefined {
    return this.configService.get<string>(name)?.trim() || undefined;
  }
}
