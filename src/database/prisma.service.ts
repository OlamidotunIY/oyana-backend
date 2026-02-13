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

  async runWithRetry<T>(
    operationName: string,
    operation: () => Promise<T>,
    options?: {
      maxRetries?: number;
      baseDelayMs?: number;
    },
  ): Promise<T> {
    const maxRetries = options?.maxRetries ?? 2;
    const baseDelayMs = options?.baseDelayMs ?? 250;

    let attempt = 0;
    // first try + retries
    while (attempt <= maxRetries) {
      try {
        return await operation();
      } catch (error) {
        const isLastAttempt = attempt === maxRetries;
        const retryable = this.isRetryableConnectionError(error);

        if (!retryable || isLastAttempt) {
          throw error;
        }

        const delayMs = baseDelayMs * Math.pow(2, attempt);
        this.logger.warn(
          `${operationName} failed with transient DB error. Retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries + 1})`,
        );

        // Best-effort reconnect before retrying.
        await this.$disconnect().catch(() => undefined);
        await this.$connect().catch(() => undefined);
        await this.sleep(delayMs);
      }

      attempt += 1;
    }

    // Unreachable, satisfies TypeScript control flow.
    throw new Error(`Unexpected retry failure for ${operationName}`);
  }

  private isRetryableConnectionError(error: unknown): boolean {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code)
        : '';

    if (code === 'P1001' || code === 'P1002' || code === 'P1017') {
      return true;
    }

    const message =
      typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message?: unknown }).message)
        : String(error);

    return (
      /can't reach database server/i.test(message) ||
      /connection terminated unexpectedly/i.test(message) ||
      /server closed the connection unexpectedly/i.test(message) ||
      /econnreset/i.test(message) ||
      /etimedout/i.test(message) ||
      /enotfound/i.test(message) ||
      /ehostunreach/i.test(message)
    );
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
