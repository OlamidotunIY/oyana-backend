import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KycService } from './kyc.service';

@Injectable()
export class KycRetentionJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KycRetentionJob.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly configService: ConfigService,
    private readonly kycService: KycService,
  ) {}

  async onModuleInit(): Promise<void> {
    const isEnabled = this.isCleanupEnabled();
    if (!isEnabled) {
      this.logger.log('KYC raw payload cleanup job is disabled');
      return;
    }

    await this.runCleanup('startup');

    const intervalMinutes = this.getCleanupIntervalMinutes();
    this.timer = setInterval(() => {
      void this.runCleanup('interval');
    }, intervalMinutes * 60 * 1000);

    this.timer.unref?.();
    this.logger.log(
      `KYC raw payload cleanup job scheduled every ${intervalMinutes} minute(s)`,
    );
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private isCleanupEnabled(): boolean {
    const configured = this.configService
      .get<string>('PREMBLY_RAW_PAYLOAD_CLEANUP_ENABLED')
      ?.trim()
      .toLowerCase();

    if (!configured) {
      return true;
    }

    return configured !== 'false' && configured !== '0';
  }

  private getCleanupIntervalMinutes(): number {
    const configured = Number(
      this.configService.get<string>(
        'PREMBLY_RAW_PAYLOAD_CLEANUP_INTERVAL_MINUTES',
      ) ?? 360,
    );

    if (!Number.isFinite(configured) || configured < 5) {
      return 360;
    }

    return Math.floor(configured);
  }

  private async runCleanup(trigger: 'startup' | 'interval'): Promise<void> {
    try {
      const count = await this.kycService.cleanupExpiredRawPayloads();
      if (count > 0) {
        this.logger.log(
          `KYC payload retention cleanup (${trigger}) purged ${count} check(s)`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `KYC payload retention cleanup (${trigger}) failed: ${message}`,
      );
    }
  }
}

