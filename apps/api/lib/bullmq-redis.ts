type BullmqRedisConnection = {
  host: string;
  port: number;
  password?: string;
};

export function getBullmqRedisConnection(): BullmqRedisConnection | null {
  const raw = process.env.REDIS_URL?.trim();
  if (!raw) {
    return null;
  }

  const url = new URL(raw);
  return {
    host: url.hostname,
    port: Number(url.port || '6379'),
    password: url.password || process.env.REDIS_PASSWORD,
  };
}
