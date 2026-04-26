import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export async function getSessionRaw(tenantSlug: string, sessionId: string): Promise<string | null> {
  const redis = createClient({
    url: REDIS_URL,
    password: process.env.REDIS_PASSWORD,
  });

  await redis.connect();
  const key = `tenant:${tenantSlug}:session:${sessionId}`;
  const data = await redis.get(key);
  await redis.disconnect();
  return data;
}
