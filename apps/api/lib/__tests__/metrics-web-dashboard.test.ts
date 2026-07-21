import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getWebDashboardMetricsJson } from '../metrics-web-dashboard';
import * as redisCache from '../redis-cache';
import * as supabase from '../supabase';

vi.mock('../supabase', () => ({
  getServiceClient: vi.fn(),
}));

vi.mock('../redis-cache', () => ({
  getCache: vi.fn(),
  setCache: vi.fn(),
}));

const COUNT_TOTAL = 10;
const COUNT_ACTIVE = 8;
const COUNT_SUSPENDED = 1;
const COUNT_DEMO = 1;
const COUNT_FAILED = 1;
const COUNT_STARTUP = 4;
const COUNT_BUSINESS = 3;
const COUNT_ENTERPRISE = 1;
const COUNT_STARTED = 100;
const COUNT_COMPLETED = 80;
const INDEX_MRR_DATA = 8;
const INDEX_STARTED = 9;
const INDEX_COMPLETED = 10;

interface MockChain {
  schema: (name: string) => MockChain;
  from: (table: string) => MockChain;
  select: (columns: string, options?: { count?: string; head?: boolean }) => MockChain;
  is: (column: string, value: string | null) => MockChain;
  eq: (column: string, value: string | boolean) => MockChain;
  gte: (column: string, value: string) => MockChain;
  then: <TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ) => Promise<TResult1 | TResult2>;
}

function createMockChain(index: number): MockChain {
  const chain: MockChain = {
    schema: () => chain,
    from: () => chain,
    select: () => chain,
    is: () => chain,
    eq: () => chain,
    gte: () => chain,
    then: (onfulfilled) => {
      let resolvedValue:
        | { count: number; data?: undefined; error: null }
        | { data: Array<{ plan: string; is_demo: boolean }>; count?: undefined; error: null };

      if (index === INDEX_MRR_DATA) {
        resolvedValue = {
          data: [
            { plan: 'startup', is_demo: false },
            { plan: 'business', is_demo: false },
            { plan: 'enterprise', is_demo: false },
            { plan: 'demo', is_demo: true },
          ],
          error: null,
        };
      } else {
        const counts: Record<number, number> = {
          0: COUNT_TOTAL,
          1: COUNT_ACTIVE,
          2: COUNT_SUSPENDED,
          3: COUNT_DEMO,
          4: COUNT_FAILED,
          5: COUNT_STARTUP,
          6: COUNT_BUSINESS,
          7: COUNT_ENTERPRISE,
          [INDEX_STARTED]: COUNT_STARTED,
          [INDEX_COMPLETED]: COUNT_COMPLETED,
        };
        resolvedValue = { count: counts[index] ?? 0, error: null };
      }
      return Promise.resolve(resolvedValue).then(onfulfilled);
    },
  };
  return chain;
}

describe('getWebDashboardMetricsJson', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns cached results immediately on a cache hit', async () => {
    const cachedData = {
      tenants: { total: 10, active: 8, suspended: 1, demo: 1, failed: 1 },
      plans: { startup: 4, business: 3, enterprise: 1 },
      mrr: 697,
      conversion: { onboard_started: 100, onboard_completed: 80, rate: 80 },
    };
    vi.mocked(redisCache.getCache).mockResolvedValueOnce(cachedData);

    const result = await getWebDashboardMetricsJson();

    expect(redisCache.getCache).toHaveBeenCalledWith('metrics:web_dashboard_json');
    expect(supabase.getServiceClient).not.toHaveBeenCalled();
    expect(result).toEqual(cachedData);
  });

  it('queries database and populates cache on a cache miss', async () => {
    vi.mocked(redisCache.getCache).mockResolvedValueOnce(null);

    let queryCount = 0;
    const mockClient = {
      schema: () => {
        const index = queryCount;
        queryCount += 1;
        return createMockChain(index);
      },
    };

    vi.mocked(supabase.getServiceClient).mockReturnValue(
      mockClient as ReturnType<typeof supabase.getServiceClient>
    );

    const result = await getWebDashboardMetricsJson();

    expect(redisCache.getCache).toHaveBeenCalledWith('metrics:web_dashboard_json');
    expect(supabase.getServiceClient).toHaveBeenCalled();
    expect(redisCache.setCache).toHaveBeenCalledWith(
      'metrics:web_dashboard_json',
      result,
      expect.any(Number)
    );

    expect(result).toEqual({
      tenants: {
        total: COUNT_TOTAL,
        active: COUNT_ACTIVE,
        suspended: COUNT_SUSPENDED,
        demo: COUNT_DEMO,
        failed: COUNT_FAILED,
      },
      plans: {
        startup: COUNT_STARTUP,
        business: COUNT_BUSINESS,
        enterprise: COUNT_ENTERPRISE,
      },
      mrr: 697, // 49 (startup) + 149 (business) + 499 (enterprise)
      conversion: {
        onboard_started: COUNT_STARTED,
        onboard_completed: COUNT_COMPLETED,
        rate: 80,
      },
    });
  });

  it('throws an error if any of the database queries fail', async () => {
    vi.mocked(redisCache.getCache).mockResolvedValueOnce(null);

    const failingChain: MockChain = {
      schema: () => failingChain,
      from: () => failingChain,
      select: () => failingChain,
      is: () => failingChain,
      eq: () => failingChain,
      gte: () => failingChain,
      then: (onfulfilled) => {
        return Promise.resolve({ error: { message: 'Database outage' } }).then(onfulfilled);
      },
    };

    const mockClient = {
      schema: () => failingChain,
    };

    vi.mocked(supabase.getServiceClient).mockReturnValue(
      mockClient as ReturnType<typeof supabase.getServiceClient>
    );

    await expect(getWebDashboardMetricsJson()).rejects.toThrow('Database outage');
    expect(redisCache.setCache).not.toHaveBeenCalled();
  });
});
