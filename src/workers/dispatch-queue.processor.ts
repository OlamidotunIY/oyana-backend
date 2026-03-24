import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { DispatchService } from '../dispatch/dispatch.service';
import {
  DISPATCH_QUEUE_NAME,
  DISPATCH_RECONCILE_DUE_JOB,
  DISPATCH_SHIPMENT_JOB,
  type DispatchReconcileJobPayload,
  type DispatchShipmentJobPayload,
} from '../queue/queue.constants';

@Processor(DISPATCH_QUEUE_NAME)
export class DispatchQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(DispatchQueueProcessor.name);

  constructor(private readonly dispatchService: DispatchService) {
    super();
  }

  async process(
    job: Job<DispatchShipmentJobPayload | DispatchReconcileJobPayload>,
  ): Promise<void> {
    if (job.name === DISPATCH_SHIPMENT_JOB) {
      const payload = job.data as DispatchShipmentJobPayload;
      await this.dispatchService.dispatchShipmentIfEligible(
        payload.shipmentId,
        payload.trigger,
      );
      return;
    }

    if (job.name === DISPATCH_RECONCILE_DUE_JOB) {
      const dispatchedCount = await this.dispatchService.dispatchDueShipments();
      this.logger.log(
        `Reconciled due dispatch shipments. Dispatched=${dispatchedCount} jobId=${job.id ?? 'n/a'}`,
      );
      return;
    }

    this.logger.warn(`Skipping unknown dispatch job: ${job.name}`);
  }

  @OnWorkerEvent('failed')
  onFailed(
    job:
      | Job<DispatchShipmentJobPayload | DispatchReconcileJobPayload>
      | undefined,
    error: Error,
  ): void {
    this.logger.error(
      `Dispatch queue job failed name=${job?.name ?? 'unknown'} id=${job?.id ?? 'n/a'} attemptsMade=${job?.attemptsMade ?? 0} message=${error.message}`,
    );
  }
}
