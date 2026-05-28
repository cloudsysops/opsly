import { beforeEach, describe, expect, it, vi } from 'vitest';

const redisGetMock = vi.hoisted(() => vi.fn());
const redisSetExMock = vi.hoisted(() => vi.fn());

vi.mock('../src/cache.js', () => ({
  getRedisClient: vi.fn(async () => ({
    get: redisGetMock,
    setEx: redisSetExMock,
  })),
}));

const supabaseFromMock = vi.hoisted(() => vi.fn());

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: supabaseFromMock,
  })),
}));

// Mock the helpers to return the client
vi.mock('../src/supabase-helpers.js', () => ({
  platformSchema: (client: any) => client,
}));

import { getTenantUsage, getPlatformLlmUsage } from '../src/logger.js';

describe('logger caching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_URL = 'http://localhost:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  });

  it('getTenantUsage retrieves from Redis if available', async () => {
    const mockUsage = {
      tokens_input: 100,
      tokens_output: 200,
      cost_usd: 0.05,
      requests: 5,
      cache_hits: 1,
      top_model: 'gpt-4o',
    };
    redisGetMock.mockResolvedValue(JSON.stringify(mockUsage));

    const result = await getTenantUsage('acme', 'today');

    expect(result).toEqual(mockUsage);
    expect(redisGetMock).toHaveBeenCalledWith('usage:tenant:acme:today');
    expect(supabaseFromMock).not.toHaveBeenCalled();
  });

  it('getTenantUsage fetches from DB and caches if Redis is empty', async () => {
    redisGetMock.mockResolvedValue(null);

    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        gte: vi.fn().mockResolvedValue({
          data: [
            { tokens_input: 10, tokens_output: 20, cost_usd: 0.01, cache_hit: false, model: 'm1' }
          ],
        }),
      }),
    });

    supabaseFromMock.mockReturnValue({
      select: selectMock,
    });

    const result = await getTenantUsage('acme', 'today');

    expect(result.requests).toBe(1);
    expect(redisSetExMock).toHaveBeenCalledWith(
      'usage:tenant:acme:today',
      60,
      expect.stringContaining('"tokens_input":10')
    );
  });

  it('getPlatformLlmUsage retrieves from Redis if available', async () => {
    const mockUsage = {
      tokens_input: 1000,
      tokens_output: 2000,
      cost_usd: 0.5,
      requests: 50,
      cache_hits: 10,
      top_model: 'gpt-4o',
    };
    redisGetMock.mockResolvedValue(JSON.stringify(mockUsage));

    const result = await getPlatformLlmUsage('month');

    expect(result).toEqual(mockUsage);
    expect(redisGetMock).toHaveBeenCalledWith('usage:platform:month');
    expect(supabaseFromMock).not.toHaveBeenCalled();
  });
});
