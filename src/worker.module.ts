import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { DispatchModule } from './dispatch/dispatch.module';
import { KycModule } from './kyc/kyc.module';
import { QueueModule } from './queue/queue.module';
import { DispatchQueueProcessor } from './workers/dispatch-queue.processor';
import { MaintenanceQueueProcessor } from './workers/maintenance-queue.processor';
import { WorkerBootstrapService } from './workers/worker-bootstrap.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    QueueModule,
    DispatchModule,
    KycModule,
  ],
  providers: [
    DispatchQueueProcessor,
    MaintenanceQueueProcessor,
    WorkerBootstrapService,
  ],
})
export class WorkerAppModule {}
