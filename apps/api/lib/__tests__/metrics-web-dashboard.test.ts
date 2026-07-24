import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getWebDashboardMetricsJson } from '../metrics-web-dashboard';
import * as redisCache from '../redis-cache';
import * as supabaseMod from '../supabase';
import { CACHE_TTL } from '../constants';

vi.mock('../supabase', () => ({
  getServiceClient: vi.fn(),
}));

vi.mock('../redis-cache', () => ({
  getCache: vi.fn(),
  setCache: vi.fn(),
}));

interface QueryState {
  table?: string;
  selectFields?: string;
  eqField?: string;
  eqValue?: unknown;
  isField?: string;
  isValue?: unknown;
  gteField?: string;
  gteValue?: unknown;
}

interface MockChain {
  schema: () => MockChain;
  from: (table: string) => MockChain;
  select: (fields?: string, options?: unknown) => MockChain;
  is: (field: string, val: unknown) => MockChain;
  eq: (field: string, val: unknown) => MockChain;
  gte: (field: string, val: unknown) => MockChain;
  then: <TResult1 = unknown, TResult2 = never>(
    onFulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
    onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) => Promise<TResult1 | TResult2>;
}

function createMockChain(state: QueryState = {}, shouldError = false): MockChain {
  const chain: MockChain = {
    schema: () => createMockChain(state, shouldError),
    from: (table: string) => createMockChain({ ...state, table }, shouldError),
    select: (fields?: string) => createMockChain({ ...state, selectFields: fields }, shouldError),
    is: (field: string, val: unknown) =>
      createMockChain({ ...state, isField: field, isValue: val }, shouldError),
    eq: (field: string, val: unknown) =>
      createMockChain({ ...state, eqField: field, eqValue: val }, shouldError),
    gte: (field: string, val: unknown) =>
      createMockChain({ ...state, gteField: field, gteValue: val }, shouldError),
    then: (onFulfilled) => {
      if (shouldError) {
        const errorRes = {
          count: null,
          data: null,
          error: { message: 'Supabase connection failed' },
        };
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        return Promise.resolve(errorRes).then(onFulfilled as any);
      }

      let count = 0;
      let data: unknown = null;

      if (state.table === 'tenants') {
        if (state.selectFields === 'plan, is_demo') {
          data = [
            { plan: 'startup', is_demo: false },
            { plan: 'business', is_demo: false },
            { plan: 'enterprise', is_demo: false },
          ];
        } else if (state.eqField === 'status' && state.eqValue === 'active') {
          count = 10;
        } else if (state.eqField === 'status' && state.eqValue === 'suspended') {
          count = 2;
        } else if (state.eqField === 'status' && state.eqValue === 'failed') {
          count = 1;
        } else if (state.eqField === 'is_demo' && state.eqValue === true) {
          count = 3;
        } else if (state.eqField === 'plan' && state.eqValue === 'startup') {
          count = 5;
        } else if (state.eqField === 'plan' && state.eqValue === 'business') {
          count = 4;
        } else if (state.eqField === 'plan' && state.eqValue === 'enterprise') {
          count = 1;
        } else {
          count = 15;
        }
      } else if (state.table === 'conversion_events') {
        if (state.eqValue === 'onboard_started') {
          count = 100;
        } else if (state.eqValue === 'onboard_completed') {
          count = 50;
        }
      }

      const successRes = { count, data, error: null };
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      return Promise.resolve(successRes).then(onFulfilled as any);
    },
  };
  return chain;
}

describe('getWebDashboardMetricsJson caching and logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns cached metrics immediately on cache hit without querying Supabase', async () => {
    const mockCachedData = {
      tenants: { total: 10, active: 8, suspended: 1, demo: 1, failed: 0 },
      plans: { startup: 4, business: 3, enterprise: 1 },
      mrr: 123,
      conversion: { onboard_started: 20, onboard_completed: 10, rate: 50 },
    };

    vi.mocked(redisCache.getCache).mockResolvedValueOnce(mockCachedData);

    const result = await getWebDashboardMetricsJson();

    expect(result).toEqual(mockCachedData);
    expect(redisCache.getCache).toHaveBeenCalledWith('metrics:web_dashboard_json');
    expect(supabaseMod.getServiceClient).not.toHaveBeenCalled();
  });

  it('queries Supabase on cache miss, caches results asynchronously, and returns them', async () => {
    vi.mocked(redisCache.getCache).mockResolvedValueOnce(null);
    vi.mocked(redisCache.setCache).mockResolvedValueOnce(true);

    const mockChain = createMockChain();
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(
      mockChain as unknown as ReturnType<typeof supabaseMod.getServiceClient>
    );

    const result = await getWebDashboardMetricsJson();

    expect(result).toBeDefined();
    expect(result.tenants.total).toBe(15);
    expect(result.tenants.active).toBe(10);
    expect(result.plans.startup).toBe(5);
    expect(result.mrr).toBe(697);
    expect(result.conversion.rate).toBe(50);

    expect(redisCache.getCache).toHaveBeenCalledWith('metrics:web_dashboard_json');
    expect(supabaseMod.getServiceClient).toHaveBeenCalled();
    expect(redisCache.setCache).toHaveBeenCalledWith(
      'metrics:web_dashboard_json',
      result,
      CACHE_TTL.SHORT
    );
  });

  it('throws an error if Supabase query fails and does not set the cache', async () => {
    vi.mocked(redisCache.getCache).mockResolvedValueOnce(null);

    const mockChainWithError = createMockChain({}, true);
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(
      mockChainWithError as unknown as ReturnType<typeof supabaseMod.getServiceClient>
    );

    await expect(getWebDashboardMetricsJson()).rejects.toThrow('Supabase connection failed');
    expect(redisCache.setCache).not.toHaveBeenCalled();
  });
});
