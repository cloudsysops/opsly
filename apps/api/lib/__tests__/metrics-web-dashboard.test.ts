import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getWebDashboardMetricsJson } from '../metrics-web-dashboard';
import * as supabase from '../supabase';
import * as redisCache from '../redis-cache';

vi.mock('../supabase', () => ({
  getServiceClient: vi.fn(),
}));

vi.mock('../redis-cache', () => ({
  getCache: vi.fn(),
  setCache: vi.fn(async () => true),
}));

describe('getWebDashboardMetricsJson', () => {
  const mockMetrics = {
    tenants: { total: 10, active: 8, suspended: 1, demo: 1, failed: 0 },
    plans: { startup: 5, business: 2, enterprise: 1 },
    mrr: 942,
    conversion: { onboard_started: 10, onboard_completed: 5, rate: 50 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
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

    const mockQuery = {
      schema: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((callback) => {
        return Promise.resolve(callback({ data: [], count: 0, error: null }));
      }),
    };

    // Special case for MRR calculation (query index 8)
    const mockMrrQuery = {
      ...mockQuery,
      then: vi.fn().mockImplementation((callback) => {
        return Promise.resolve(callback({
          data: [
            { plan: 'startup', is_demo: false },
            { plan: 'business', is_demo: false }
          ],
          error: null
        }));
      }),
    };

    const mockClient = {
      schema: vi.fn().mockReturnThis(),
      from: vi.fn().mockImplementation((table) => {
        if (table === 'tenants') {
          // We need to return different results based on the query,
          // but for this baseline, just returning success is enough to test flow.
          // In a real test we might want to be more specific.
          return mockMrrQuery;
        }
        return mockQuery;
      }),
    };

    vi.mocked(supabase.getServiceClient).mockReturnValue(mockClient as any);

    const result = await getWebDashboardMetricsJson();

    expect(result).toBeDefined();
    expect(supabase.getServiceClient).toHaveBeenCalled();
    expect(redisCache.setCache).toHaveBeenCalledWith(
      'metrics:web_dashboard_json',
      expect.anything(),
      60
    );
  });
});
