import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WorkerAppModule } from './worker.module';

async function bootstrapWorker(): Promise<void> {
  process.env.RUNTIME_ROLE = 'worker';
  const logger = new Logger('Worker');

  const app = await NestFactory.createApplicationContext(WorkerAppModule, {
    logger: ['log', 'error', 'warn'],
  });

  logger.log('BullMQ worker application started');

  const shutdown = async (signal: string) => {
    logger.log(`Received ${signal}. Closing worker application...`);
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
}

void bootstrapWorker();
