import { ConfigService } from '@nestjs/config';
import type { ConnectionOptions } from 'bullmq';

const DEFAULT_REDIS_HOST = '127.0.0.1';
const DEFAULT_REDIS_PORT = 6379;

const parseNumber = (
  rawValue: string | undefined,
  fallback: number,
): number => {
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.floor(parsed);
};

const parseBoolean = (
  rawValue: string | undefined,
  fallback = false,
): boolean => {
  if (!rawValue) {
    return fallback;
  }

  const normalized = rawValue.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
};

const getFirstPresent = (
  configService: ConfigService,
  keys: string[],
): string | undefined => {
  for (const key of keys) {
    const value = configService.get<string>(key)?.trim();
    if (value) {
      return value;
    }
  }

  return undefined;
};

export const buildRedisConnection = (
  configService: ConfigService,
): ConnectionOptions => {
  const redisUrl = configService.get<string>('REDIS_URL')?.trim();
  if (redisUrl) {
    return {
      url: redisUrl,
      maxRetriesPerRequest: null,
    };
  }

  const host =
    configService.get<string>('REDIS_HOST')?.trim() ?? DEFAULT_REDIS_HOST;
  const port = parseNumber(
    configService.get<string>('REDIS_PORT'),
    DEFAULT_REDIS_PORT,
  );
  const db = parseNumber(configService.get<string>('REDIS_DB'), 0);
  const username = getFirstPresent(configService, [
    'REDIS_USERNAME',
    'REDIS_USER',
  ]);
  const password = getFirstPresent(configService, [
    'REDIS_PASSWORD',
    'REDIS_PASS',
  ]);
  const tlsEnabled = parseBoolean(configService.get<string>('REDIS_TLS'));

  return {
    host,
    port,
    db,
    username: username || undefined,
    password: password || undefined,
    tls: tlsEnabled ? {} : undefined,
    maxRetriesPerRequest: null,
  };
};
