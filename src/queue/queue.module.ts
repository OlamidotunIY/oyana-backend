import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { buildRedisConnection } from './queue.config';
import { DISPATCH_QUEUE_NAME, MAINTENANCE_QUEUE_NAME } from './queue.constants';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: buildRedisConnection(configService),
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1_000,
          },
          removeOnComplete: {
            count: 1_000,
          },
          removeOnFail: {
            count: 5_000,
          },
        },
      }),
    }),
    BullModule.registerQueue(
      {
        name: DISPATCH_QUEUE_NAME,
      },
      {
        name: MAINTENANCE_QUEUE_NAME,
      },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
