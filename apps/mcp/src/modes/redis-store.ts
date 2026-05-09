/**
 * Persistencia de modo activo por sesión (Redis compartido con LLM Gateway / OAuth).
 */

import { getRedisClient } from '@intcloudsysops/llm-gateway/cache';

const KEY_PREFIX = 'opsly:mode:';
/** 8 h — alineado al plan Mode System. */
export const MODE_REDIS_TTL_SECONDS = 8 * 3600;

function key(sessionId: string): string {
  return `${KEY_PREFIX}${sessionId}`;
}

export async function redisGetActiveMode(sessionId: string): Promise<string | null> {
  const redis = await getRedisClient();
  return redis.get(key(sessionId));
}

export async function redisSetActiveMode(sessionId: string, modeId: string): Promise<void> {
  const redis = await getRedisClient();
  await redis.setEx(key(sessionId), MODE_REDIS_TTL_SECONDS, modeId);
}

export async function redisClearActiveMode(sessionId: string): Promise<void> {
  const redis = await getRedisClient();
  await redis.del(key(sessionId));
}
