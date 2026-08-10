import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getWebDashboardMetricsJson, type WebDashboardMetricsJson } from '../metrics-web-dashboard';
import * as supabaseMod from '../supabase';
import * as redisCacheMod from '../redis-cache';
import { CACHE_TTL } from '../constants';

vi.mock('../supabase', () => ({
  getServiceClient: vi.fn(),
}));

vi.mock('../redis-cache', () => ({
  getCache: vi.fn(),
  setCache: vi.fn(() => Promise.resolve(true)),
}));

interface MockChain {
  schema: (name: string) => MockChain;
  from: (table: string) => MockChain;
  select: (columns?: string, options?: unknown) => MockChain;
  is: (column: string, value: unknown) => MockChain;
  eq: (column: string, value: unknown) => MockChain;
  gte: (column: string, value: unknown) => MockChain;
  then: <TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) => Promise<TResult1 | TResult2>;
}

function createMockClient(): ReturnType<typeof supabaseMod.getServiceClient> {
  const chainBuilder = (filters: {
    status?: string;
    plan?: string;
    is_demo?: boolean;
    event?: string;
    select_cols?: string;
  } = {}): MockChain => {
    const chain: MockChain = {
      schema: () => chain,
      from: () => chain,
      select: (cols) => {
        return chainBuilder({ ...filters, select_cols: cols as string });
      },
      is: () => chain,
      eq: (col, val) => {
        const nextFilters = { ...filters };
        if (col === 'status') nextFilters.status = val as string;
        if (col === 'plan') nextFilters.plan = val as string;
        if (col === 'is_demo') nextFilters.is_demo = val as boolean;
        if (col === 'event') nextFilters.event = val as string;
        return chainBuilder(nextFilters);
      },
      gte: () => chain,
      then: (onfulfilled) => {
        let result: { count: number | null; data: { plan: string; is_demo: boolean }[] | null; error: null } = {
          count: 0,
          data: null,
          error: null,
        };

        if (filters.select_cols === 'plan, is_demo') {
          result = {
            count: null,
            data: [
              { plan: 'startup', is_demo: false },
              { plan: 'business', is_demo: false },
              { plan: 'enterprise', is_demo: false },
            ],
            error: null,
          };
        } else if (filters.status === 'active') {
          result = { count: 5, data: null, error: null };
        } else if (filters.status === 'suspended') {
          result = { count: 1, data: null, error: null };
        } else if (filters.is_demo === true) {
          result = { count: 2, data: null, error: null };
        } else if (filters.status === 'failed') {
          result = { count: 0, data: null, error: null };
        } else if (filters.plan === 'startup') {
          result = { count: 3, data: null, error: null };
        } else if (filters.plan === 'business') {
          result = { count: 1, data: null, error: null };
        } else if (filters.plan === 'enterprise') {
          result = { count: 1, data: null, error: null };
        } else if (filters.event === 'onboard_started') {
          result = { count: 10, data: null, error: null };
        } else if (filters.event === 'onboard_completed') {
          result = { count: 5, data: null, error: null };
        } else {
          // Total tenants count
          result = { count: 7, data: null, error: null };
        }

        return Promise.resolve(result).then(onfulfilled);
      },
    };
    return chain;
  };

  return chainBuilder() as unknown as ReturnType<typeof supabaseMod.getServiceClient>;
}

describe('getWebDashboardMetricsJson with Redis caching', () => {
  const cacheKey = 'metrics:web_dashboard_json';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns cached metrics immediately on cache hit without calling Supabase', async () => {
    const mockCachedMetrics: WebDashboardMetricsJson = {
      tenants: {
        total: 15,
        active: 10,
        suspended: 2,
        demo: 3,
        failed: 0,
      },
      plans: { startup: 5, business: 3, enterprise: 2 },
      mrr: 1690,
      conversion: { onboard_started: 20, onboard_completed: 10, rate: 50 },
    };

    vi.mocked(redisCacheMod.getCache).mockResolvedValueOnce(mockCachedMetrics);

    const result = await getWebDashboardMetricsJson();

    expect(result).toEqual(mockCachedMetrics);
    expect(redisCacheMod.getCache).toHaveBeenCalledWith(cacheKey);
    expect(supabaseMod.getServiceClient).not.toHaveBeenCalled();
    expect(redisCacheMod.setCache).not.toHaveBeenCalled();
  });

  it('queries Supabase on cache miss, sets the cache, and returns the constructed metrics', async () => {
    vi.mocked(redisCacheMod.getCache).mockResolvedValueOnce(null);
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(createMockClient());

    const result = await getWebDashboardMetricsJson();

    expect(redisCacheMod.getCache).toHaveBeenCalledWith(cacheKey);
    expect(supabaseMod.getServiceClient).toHaveBeenCalled();

    // Check constructed metrics match createMockClient expectations
    expect(result).toEqual({
      tenants: {
        total: 7,
        active: 5,
        suspended: 1,
        demo: 2,
        failed: 0,
      },
      plans: {
        startup: 3,
        business: 1,
        enterprise: 1,
      },
      mrr: 49 + 149 + 499, // startup + business + enterprise MRR
      conversion: {
        onboard_started: 10,
        onboard_completed: 5,
        rate: 50,
      },
    });

    // Verify background setCache was triggered with expected key, value and short TTL
    expect(redisCacheMod.setCache).toHaveBeenCalledWith(cacheKey, result, CACHE_TTL.SHORT);
  });
});
