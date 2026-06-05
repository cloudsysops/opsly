import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCache, setCache, getRedisClient } from '../redis-cache';

vi.mock('redis', () => {
  const mRedis = {
    connect: vi.fn(),
    on: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    isOpen: true,
  };
  return {
    createClient: vi.fn(() => mRedis),
  };
});

describe('redis-cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCache', () => {
    it('returns null if redis is not configured', async () => {
      vi.stubEnv('REDIS_URL', '');
      const val = await getCache('key');
      expect(val).toBeNull();
      vi.unstubAllEnvs();
    });

    it('returns parsed value from redis', async () => {
      vi.stubEnv('REDIS_URL', 'redis://localhost');
      const redis = await getRedisClient();
      vi.mocked(redis!.get).mockResolvedValueOnce(JSON.stringify({ a: 1 }));

      const val = await getCache<{ a: number }>('key');
      expect(val).toEqual({ a: 1 });
      expect(redis!.get).toHaveBeenCalledWith('key');
      vi.unstubAllEnvs();
    });

    it('returns null if value not found', async () => {
      vi.stubEnv('REDIS_URL', 'redis://localhost');
      const redis = await getRedisClient();
      vi.mocked(redis!.get).mockResolvedValueOnce(null);

      const val = await getCache('key');
      expect(val).toBeNull();
      vi.unstubAllEnvs();
    });
  });

  describe('setCache', () => {
    it('sets value in redis with TTL', async () => {
      vi.stubEnv('REDIS_URL', 'redis://localhost');
      const redis = await getRedisClient();
      vi.mocked(redis!.set).mockResolvedValueOnce('OK');

      const success = await setCache('key', { b: 2 }, 60);
      expect(success).toBe(true);
      expect(redis!.set).toHaveBeenCalledWith('key', JSON.stringify({ b: 2 }), { EX: 60 });
      vi.unstubAllEnvs();
    });
  });
});
