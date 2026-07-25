import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getWebDashboardMetricsJson } from '../metrics-web-dashboard';
import * as redisCache from '../redis-cache';
import * as supabaseLib from '../supabase';

vi.mock('../redis-cache', () => ({
  getCache: vi.fn(),
  setCache: vi.fn(async () => true),
}));

vi.mock('../supabase', () => ({
  getServiceClient: vi.fn(),
}));

interface MockChain {
  schema(name: string): MockChain;
  from(table: string): MockChain;
  select(columns: string, options?: unknown): MockChain;
  is(column: string, value: unknown): MockChain;
  eq(column: string, value: unknown): MockChain;
  gte(column: string, value: unknown): MockChain;
  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2>;
}

describe('getWebDashboardMetricsJson', () => {
  let queryIndex = 0;
  let mockResponses: Array<{ count?: number; data?: unknown[]; error: unknown }> = [];

  function createMockChain(): MockChain {
    const chain: MockChain = {
      schema: () => chain,
      from: () => chain,
      select: () => chain,
      is: () => chain,
      eq: () => chain,
      gte: () => chain,
      then: (onfulfilled) => {
        const resp = mockResponses[queryIndex];
        queryIndex = (queryIndex + 1) % mockResponses.length;
        return Promise.resolve(resp).then(onfulfilled);
      },
    };
    return chain;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    queryIndex = 0;

    // Default mock response list for 11 sequential queries
    mockResponses = [
      { count: 10, error: null }, // total
      { count: 8, error: null }, // active
      { count: 1, error: null }, // suspended
      { count: 2, error: null }, // demo
      { count: 1, error: null }, // failed
      { count: 4, error: null }, // startup
      { count: 3, error: null }, // business
      { count: 1, error: null }, // enterprise
      {
        data: [
          { plan: 'startup', is_demo: false },
          { plan: 'business', is_demo: false },
          { plan: 'enterprise', is_demo: false },
        ],
        error: null,
      }, // active plan list for MRR calculation
      { count: 15, error: null }, // onboard_started
      { count: 12, error: null }, // onboard_completed
    ];
  });

  it('returns cached metrics immediately on cache hit without querying database', async () => {
    const cachedMetrics = {
      tenants: { total: 5, active: 4, suspended: 1, demo: 0, failed: 0 },
      plans: { startup: 2, business: 2, enterprise: 0 },
      mrr: 198,
      conversion: { onboard_started: 10, onboard_completed: 8, rate: 80 },
    };

    vi.mocked(redisCache.getCache).mockResolvedValue(cachedMetrics);

    const result = await getWebDashboardMetricsJson();

    expect(result).toEqual(cachedMetrics);
    expect(redisCache.getCache).toHaveBeenCalledWith('metrics:web_dashboard_json');
    expect(supabaseLib.getServiceClient).not.toHaveBeenCalled();
  });

  it('performs query and caches the result on cache miss', async () => {
    vi.mocked(redisCache.getCache).mockResolvedValue(null);

    const mockChain = createMockChain();
    vi.mocked(supabaseLib.getServiceClient).mockReturnValue(
      mockChain as unknown as ReturnType<typeof supabaseLib.getServiceClient>
    );

    const result = await getWebDashboardMetricsJson();

    // Expected compiled metrics:
    // MRR: startup (49) + business (149) + enterprise (499) = 697
    // Conversion rate: 12 / 15 * 100 = 80
    expect(result).toEqual({
      tenants: { total: 10, active: 8, suspended: 1, demo: 2, failed: 1 },
      plans: { startup: 4, business: 3, enterprise: 1 },
      mrr: 697,
      conversion: { onboard_started: 15, onboard_completed: 12, rate: 80 },
    });

    expect(redisCache.getCache).toHaveBeenCalledWith('metrics:web_dashboard_json');
    expect(supabaseLib.getServiceClient).toHaveBeenCalled();
    expect(redisCache.setCache).toHaveBeenCalledWith('metrics:web_dashboard_json', result, 60);
  });

  it('throws an error if any of the database queries fail', async () => {
    vi.mocked(redisCache.getCache).mockResolvedValue(null);

    // Make the first query fail
    mockResponses[0] = { error: { message: 'Database connection lost' } };

    const mockChain = createMockChain();
    vi.mocked(supabaseLib.getServiceClient).mockReturnValue(
      mockChain as unknown as ReturnType<typeof supabaseLib.getServiceClient>
    );

    await expect(getWebDashboardMetricsJson()).rejects.toThrow('Database connection lost');
    expect(redisCache.setCache).not.toHaveBeenCalled();
  });
});
