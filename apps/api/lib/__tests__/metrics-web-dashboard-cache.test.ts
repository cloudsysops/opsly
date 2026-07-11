import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getWebDashboardMetricsJson } from '../metrics-web-dashboard';
import * as redisCache from '../redis-cache';
import * as supabase from '../supabase';

vi.mock('../redis-cache', () => ({
  getCache: vi.fn(),
  setCache: vi.fn(async () => true),
}));

vi.mock('../logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

vi.mock('../supabase', () => ({
  getServiceClient: vi.fn(),
}));

describe('getWebDashboardMetricsJson caching', () => {
  const mockMetrics = {
    tenants: { total: 10, active: 8, suspended: 1, demo: 1, failed: 0 },
    plans: { startup: 5, business: 2, enterprise: 1 },
    mrr: 1000,
    conversion: { onboard_started: 20, onboard_completed: 10, rate: 50 },
  };

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const createMockSupabaseClient = (): unknown => {
    const mock: any = {
      schema: vi.fn().mockImplementation(() => mock),
      from: vi.fn().mockImplementation(() => mock),
      select: vi.fn().mockImplementation(() => mock),
      is: vi.fn().mockImplementation(() => mock),
      eq: vi.fn().mockImplementation(() => mock),
      gte: vi.fn().mockImplementation(() => mock),
      // Make it thenable to work with await/Promise.all
      then: vi.fn().mockImplementation((onFulfilled) => {
        // Return a default successful response
        return Promise.resolve(onFulfilled({ count: 10, data: [], error: null }));
      }),
    };
    return mock;
  };

  let mockSupabaseClient: any;
  /* eslint-enable @typescript-eslint/no-explicit-any */

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseClient = createMockSupabaseClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    vi.mocked(supabase.getServiceClient).mockReturnValue(mockSupabaseClient);
  });

  it('returns cached metrics if available', async () => {
    vi.mocked(redisCache.getCache).mockResolvedValue(mockMetrics);

    const result = await getWebDashboardMetricsJson();

    expect(result).toEqual(mockMetrics);
    expect(redisCache.getCache).toHaveBeenCalledWith('metrics:web_dashboard_json');
    expect(supabase.getServiceClient).not.toHaveBeenCalled();
  });

  it('fetches from Supabase on cache miss and sets cache', async () => {
    vi.mocked(redisCache.getCache).mockResolvedValue(null);

    // Customize then for the MRR query (which uses .data)
    // The MRR query is the 9th query (index 8)
    let callCount = 0;
    mockSupabaseClient.then.mockImplementation((onFulfilled: (res: unknown) => unknown) => {
      callCount++;
      if (callCount === 9) {
        return Promise.resolve(
          onFulfilled({ data: [{ plan: 'startup', is_demo: false }], error: null })
        );
      }
      return Promise.resolve(onFulfilled({ count: 10, error: null }));
    });

    const result = await getWebDashboardMetricsJson();

    expect(result).toBeDefined();
    expect(result.tenants.total).toBe(10);
    expect(redisCache.getCache).toHaveBeenCalledWith('metrics:web_dashboard_json');
    expect(supabase.getServiceClient).toHaveBeenCalled();
    expect(redisCache.setCache).toHaveBeenCalledWith(
      'metrics:web_dashboard_json',
      expect.any(Object),
      expect.any(Number)
    );
  });
});
