import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getTenantUsage, getPlatformLlmUsage } from '../src/logger.js';
import { platformSchema, supabaseRpc } from '../src/supabase-helpers.js';

vi.mock('../src/supabase-helpers.js', () => ({
  platformSchema: vi.fn(),
  supabaseRpc: vi.fn(),
}));

vi.mock('../src/cache.js', () => ({
  getRedisClient: vi.fn().mockResolvedValue({
    get: vi.fn().mockResolvedValue(null),
    setEx: vi.fn().mockResolvedValue('OK'),
  }),
}));

describe('logger usage aggregation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_URL = 'http://localhost:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  });

  it('getTenantUsage aggregates correctly via RPC', async () => {
    const mockStats = {
      tokens_input: 16,
      tokens_output: 31,
      cost_usd: 0.16,
      requests: 3,
      cache_hits: 1,
      top_model: 'gpt-4',
    };

    (supabaseRpc as any).mockResolvedValue({ data: mockStats, error: null });

    const result = await getTenantUsage('test-tenant', 'today');

    expect(supabaseRpc).toHaveBeenCalledWith(expect.anything(), 'get_llm_usage_stats', expect.objectContaining({
      p_tenant_slug: 'test-tenant'
    }));

    expect(result.tokens_input).toBe(16);
    expect(result.tokens_output).toBe(31);
    expect(result.cost_usd).toBeCloseTo(0.16);
    expect(result.requests).toBe(3);
    expect(result.cache_hits).toBe(1);
    expect(result.top_model).toBe('gpt-4');
  });

  it('getPlatformLlmUsage aggregates correctly via RPC', async () => {
    const mockStats = {
      tokens_input: 150,
      tokens_output: 300,
      cost_usd: 1.5,
      requests: 2,
      cache_hits: 1,
      top_model: 'claude-3',
    };

    (supabaseRpc as any).mockResolvedValue({ data: mockStats, error: null });

    const result = await getPlatformLlmUsage('month');

    expect(supabaseRpc).toHaveBeenCalledWith(expect.anything(), 'get_llm_usage_stats', expect.objectContaining({
      p_from_date: expect.any(String)
    }));

    expect(result).toEqual({
      tokens_input: 150,
      tokens_output: 300,
      cost_usd: 1.5,
      requests: 2,
      cache_hits: 1,
      top_model: 'claude-3',
    });
  });
});
