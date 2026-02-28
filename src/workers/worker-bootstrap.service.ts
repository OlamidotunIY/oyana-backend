import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import {
  DISPATCH_QUEUE_NAME,
  DISPATCH_RECONCILE_DUE_JOB,
  KYC_CLEANUP_JOB,
  MAINTENANCE_QUEUE_NAME,
  type DispatchReconcileJobPayload,
  type KycCleanupJobPayload,
} from '../queue/queue.constants';

const DEFAULT_DISPATCH_RECONCILE_INTERVAL_SECONDS = 120;
const DEFAULT_KYC_CLEANUP_INTERVAL_MINUTES = 360;

@Injectable()
export class WorkerBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(WorkerBootstrapService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectQueue(DISPATCH_QUEUE_NAME)
    private readonly dispatchQueue: Queue<DispatchReconcileJobPayload>,
    @InjectQueue(MAINTENANCE_QUEUE_NAME)
    private readonly maintenanceQueue: Queue<KycCleanupJobPayload>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.assertRedisConnections();
    await this.registerDispatchReconcileJob();
    await this.registerKycCleanupJobs();
  }

  private async assertRedisConnections(): Promise<void> {
    await Promise.all([
      this.dispatchQueue.waitUntilReady(),
      this.maintenanceQueue.waitUntilReady(),
    ]);

    this.logger.log('BullMQ queues connected and ready');
  }

  private async registerDispatchReconcileJob(): Promise<void> {
    const intervalSeconds = this.parseIntWithDefault(
      this.configService.get<string>('DISPATCH_RECONCILE_INTERVAL_SECONDS'),
      DEFAULT_DISPATCH_RECONCILE_INTERVAL_SECONDS,
      15,
    );
    const intervalMs = intervalSeconds * 1_000;

    await this.dispatchQueue.upsertJobScheduler(
      DISPATCH_RECONCILE_DUE_JOB,
      {
        every: intervalMs,
      },
      {
        name: DISPATCH_RECONCILE_DUE_JOB,
        data: { reason: 'periodic' },
      },
    );

    this.logger.log(
      `Registered dispatch reconcile job every ${intervalSeconds} second(s)`,
    );
  }

  private async registerKycCleanupJobs(): Promise<void> {
    const cleanupEnabled = this.isKycCleanupEnabled();
    if (!cleanupEnabled) {
      this.logger.log('KYC cleanup scheduling is disabled');
      return;
    }

    const intervalMinutes = this.parseIntWithDefault(
      this.configService.get<string>(
        'PREMBLY_RAW_PAYLOAD_CLEANUP_INTERVAL_MINUTES',
      ),
      DEFAULT_KYC_CLEANUP_INTERVAL_MINUTES,
      5,
    );
    const intervalMs = intervalMinutes * 60 * 1_000;

    await this.maintenanceQueue.upsertJobScheduler(
      KYC_CLEANUP_JOB,
      {
        every: intervalMs,
      },
      {
        name: KYC_CLEANUP_JOB,
        data: { trigger: 'interval' },
      },
    );

    await this.maintenanceQueue.add(
      KYC_CLEANUP_JOB,
      { trigger: 'startup' },
      {
        jobId: `${KYC_CLEANUP_JOB}-startup-${Date.now()}`,
      },
    );

    this.logger.log(
      `Registered KYC cleanup jobs (startup + every ${intervalMinutes} minute(s))`,
    );
  }

  private isKycCleanupEnabled(): boolean {
    const configured = this.configService
      .get<string>('PREMBLY_RAW_PAYLOAD_CLEANUP_ENABLED')
      ?.trim()
      .toLowerCase();

    if (!configured) {
      return true;
    }

    return configured !== 'false' && configured !== '0';
  }

  private parseIntWithDefault(
    rawValue: string | undefined,
    fallback: number,
    minValue = 1,
  ): number {
    if (!rawValue) {
      return fallback;
    }

    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }

    const normalized = Math.floor(parsed);
    if (normalized < minValue) {
      return fallback;
    }

    return normalized;
  }
}
