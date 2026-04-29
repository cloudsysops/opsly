import Redis from 'ioredis';

function parseRedisConfig(): { host: string; port: number; password?: string } {
  const raw = process.env.REDIS_URL || 'redis://localhost:6379';
  const parsed = new URL(raw);
  const password = parsed.password ? decodeURIComponent(parsed.password) : '';
  return {
    host: parsed.hostname,
    port: Number(parsed.port || '6379'),
    password: process.env.REDIS_PASSWORD || password || undefined,
  };
}

export function createHiveRedisClient(): Redis {
  const cfg = parseRedisConfig();
  return new Redis({
    host: cfg.host,
    port: cfg.port,
    password: cfg.password,
    lazyConnect: false,
    maxRetriesPerRequest: null,
  });
}
