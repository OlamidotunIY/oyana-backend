import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL is not defined');
    }

    super({
      adapter: new PrismaPg(
        {
          connectionString,
          max: Number(process.env.PG_POOL_MAX ?? 10),
          idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS ?? 30000),
          connectionTimeoutMillis: Number(
            process.env.PG_CONNECTION_TIMEOUT_MS ?? 10000,
          ),
          keepAlive: true,
          keepAliveInitialDelayMillis: Number(
            process.env.PG_KEEPALIVE_INITIAL_DELAY_MS ?? 10000,
          ),
        },
        {
          onConnectionError: (error) => {
            this.logger.warn(
              `Postgres connection error: ${error.message || String(error)}`,
            );
          },
          onPoolError: (error) => {
            this.logger.error(
              `Postgres pool error: ${error.message || String(error)}`,
            );
          },
        },
      ),
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
