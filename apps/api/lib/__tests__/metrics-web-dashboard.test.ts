import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getWebDashboardMetricsJson } from '../metrics-web-dashboard';
import * as redisCache from '../redis-cache';
import * as supabase from '../supabase';

vi.mock('../redis-cache', () => ({
  getCache: vi.fn(),
  setCache: vi.fn(),
}));

vi.mock('../supabase', () => ({
  getServiceClient: vi.fn(),
}));

interface MockChainResponse {
  count?: number;
  data?: Array<{ plan: string; is_demo: boolean }>;
  error?: { message: string } | null;
}

interface MockChain {
  schema: (name: string) => MockChain;
  from: (table: string) => MockChain;
  select: (columns?: string, options?: { count?: string; head?: boolean }) => MockChain;
  is: (column: string, value: null) => MockChain;
  eq: (column: string, value: string | boolean) => MockChain;
  gte: (column: string, value: string) => MockChain;
  then: <TResult1 = MockChainResponse, TResult2 = never>(
    onfulfilled?: ((value: MockChainResponse) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) => Promise<TResult1 | TResult2>;
}

function createMockPromise(resolvedValue: MockChainResponse): MockChain {
  const promise = Promise.resolve(resolvedValue);
  const chain: MockChain = {
    schema: () => chain,
    from: () => chain,
    select: () => chain,
    is: () => chain,
    eq: () => chain,
    gte: () => chain,
    then: (onfulfilled, onrejected) => promise.then(onfulfilled, onrejected),
  };
  return chain;
}

describe('getWebDashboardMetricsJson', () => {
  const mockMetrics = {
    tenants: {
      total: 10,
      active: 8,
      suspended: 1,
      demo: 1,
      failed: 0,
    },
    plans: {
      startup: 5,
      business: 2,
      enterprise: 1,
    },
    mrr: 1042, // 5 * 49 + 2 * 149 + 1 * 499
    conversion: {
      onboard_started: 20,
      onboard_completed: 10,
      rate: 50,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return cached metrics if available and skip Supabase query', async () => {
    vi.mocked(redisCache.getCache).mockResolvedValue(mockMetrics);

    const result = await getWebDashboardMetricsJson();

    expect(result).toEqual(mockMetrics);
    expect(redisCache.getCache).toHaveBeenCalledWith('metrics:web_dashboard_json');
    expect(supabase.getServiceClient).not.toHaveBeenCalled();
  });

  it('should query Supabase on cache miss, return calculated metrics, and save to cache', async () => {
    vi.mocked(redisCache.getCache).mockResolvedValue(null);
    vi.mocked(redisCache.setCache).mockResolvedValue(true);

    const activePaidData = [
      { plan: 'startup', is_demo: false },
      { plan: 'startup', is_demo: false },
      { plan: 'startup', is_demo: false },
      { plan: 'startup', is_demo: false },
      { plan: 'startup', is_demo: false },
      { plan: 'business', is_demo: false },
      { plan: 'business', is_demo: false },
      { plan: 'enterprise', is_demo: false },
    ];

    const mockQueryResponses: MockChainResponse[] = [
      { count: 10 }, // total
      { count: 8 }, // active
      { count: 1 }, // suspended
      { count: 1 }, // demo
      { count: 0 }, // failed
      { count: 5 }, // startup
      { count: 2 }, // business
      { count: 1 }, // enterprise
      { data: activePaidData }, // active paid
      { count: 20 }, // started
      { count: 10 }, // completed
    ];

    let queryCallIndex = 0;
    const mockServiceClient = {
      schema: () => mockServiceClient,
      from: () => mockServiceClient,
      select: () => {
        const resp = mockQueryResponses[queryCallIndex];
        queryCallIndex += 1;
        return createMockPromise(resp);
      },
    } as unknown as ReturnType<typeof supabase.getServiceClient>;

    vi.mocked(supabase.getServiceClient).mockReturnValue(mockServiceClient);

    const result = await getWebDashboardMetricsJson();

    expect(result).toEqual(mockMetrics);
    expect(redisCache.getCache).toHaveBeenCalledWith('metrics:web_dashboard_json');
    expect(redisCache.setCache).toHaveBeenCalledWith('metrics:web_dashboard_json', mockMetrics, 60);
  });
});
