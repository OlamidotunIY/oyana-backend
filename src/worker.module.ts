import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DatabaseModule } from './database/database.module';
import { DispatchModule } from './dispatch/dispatch.module';
import { KycModule } from './kyc/kyc.module';
import { QueueModule } from './queue/queue.module';
import { DispatchQueueProcessor } from './workers/dispatch-queue.processor';
import { MaintenanceQueueProcessor } from './workers/maintenance-queue.processor';
import { WorkerBootstrapService } from './workers/worker-bootstrap.service';
import { EnvValidationService } from './config/env-validation.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EventEmitterModule.forRoot(),
    DatabaseModule,
    QueueModule,
    DispatchModule,
    KycModule,
  ],
  providers: [
    DispatchQueueProcessor,
    MaintenanceQueueProcessor,
    WorkerBootstrapService,
    EnvValidationService,
  ],
})
export class WorkerAppModule {}
