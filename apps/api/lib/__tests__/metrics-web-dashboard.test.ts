import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetCache, mockSetCache, mockSchema } = vi.hoisted(() => {
  const mockGetCache = vi.fn();
  const mockSetCache = vi.fn();
  const mockSchema = vi.fn();
  return {
    mockGetCache,
    mockSetCache,
    mockSchema,
  };
});

vi.mock('../redis-cache', () => ({
  getCache: mockGetCache,
  setCache: mockSetCache,
}));

vi.mock('../supabase', () => ({
  getServiceClient: () => ({
    schema: mockSchema,
  }),
}));

import { getWebDashboardMetricsJson } from '../metrics-web-dashboard';

describe('getWebDashboardMetricsJson', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCache.mockResolvedValue(null);
  });

  it('returns cached metrics if available and avoids querying Supabase', async () => {
    const cachedMetrics = {
      tenants: {
        total: 20,
        active: 15,
        suspended: 2,
        demo: 2,
        failed: 1,
      },
      plans: { startup: 8, business: 5, enterprise: 2 },
      mrr: 1500,
      conversion: { onboard_started: 10, onboard_completed: 8, rate: 80 },
    };
    mockGetCache.mockResolvedValue(cachedMetrics);

    const result = await getWebDashboardMetricsJson();

    expect(result).toEqual(cachedMetrics);
    expect(mockGetCache).toHaveBeenCalledWith('metrics:web_dashboard_json');
    expect(mockSchema).not.toHaveBeenCalled();
  });

  it('fetches from Supabase on cache miss, computes metrics, and sets the cache', async () => {
    mockGetCache.mockResolvedValue(null);

    interface MockChain {
      is: () => MockChain;
      eq: () => MockChain;
      gte: () => MockChain;
      then: (onFulfilled: (v: unknown) => unknown) => Promise<unknown>;
    }

    // Mock query builder chain for the 11 parallel queries
    const mockChain: MockChain = {
      is: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      then: (onFulfilled: (v: unknown) => unknown) => {
        return Promise.resolve({
          count: 10,
          data: [{ plan: 'startup', is_demo: false }],
          error: null,
        }).then(onFulfilled);
      },
    };

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue(mockChain),
    });

    mockSchema.mockReturnValue({
      from: mockFrom,
    });

    const result = await getWebDashboardMetricsJson();

    // Verify correct structure and calculation
    expect(result).toEqual({
      tenants: {
        total: 10,
        active: 10,
        suspended: 10,
        demo: 10,
        failed: 10,
      },
      plans: {
        startup: 10,
        business: 10,
        enterprise: 10,
      },
      mrr: 49, // startup plan = 49 USD
      conversion: {
        onboard_started: 10,
        onboard_completed: 10,
        rate: 100,
      },
    });

    expect(mockGetCache).toHaveBeenCalledWith('metrics:web_dashboard_json');
    expect(mockSchema).toHaveBeenCalled();
    expect(mockSetCache).toHaveBeenCalledWith(
      'metrics:web_dashboard_json',
      result,
      60 // CACHE_TTL.SHORT is 60 seconds
    );
  });
});
