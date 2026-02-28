import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { KycService } from '../kyc/kyc.service';
import {
  KYC_CLEANUP_JOB,
  MAINTENANCE_QUEUE_NAME,
  type KycCleanupJobPayload,
} from '../queue/queue.constants';

@Processor(MAINTENANCE_QUEUE_NAME)
export class MaintenanceQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(MaintenanceQueueProcessor.name);

  constructor(private readonly kycService: KycService) {
    super();
  }

  async process(job: Job<KycCleanupJobPayload>): Promise<void> {
    if (job.name !== KYC_CLEANUP_JOB) {
      this.logger.warn(`Skipping unknown maintenance job: ${job.name}`);
      return;
    }

    try {
      const deletedCount = await this.kycService.cleanupExpiredRawPayloads();
      if (deletedCount > 0) {
        this.logger.log(
          `KYC payload cleanup (${job.data.trigger}) removed ${deletedCount} check(s)`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `KYC payload cleanup (${job.data.trigger}) failed: ${message}`,
      );
      throw error;
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<KycCleanupJobPayload> | undefined, error: Error): void {
    this.logger.error(
      `Maintenance queue job failed name=${job?.name ?? 'unknown'} id=${job?.id ?? 'n/a'} attemptsMade=${job?.attemptsMade ?? 0} message=${error.message}`,
    );
  }
}
