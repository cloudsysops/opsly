import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getWebDashboardMetricsJson } from '../metrics-web-dashboard';
import * as redisCache from '../redis-cache';
import * as supabase from '../supabase';

vi.mock('../redis-cache', () => ({
  getCache: vi.fn(),
  setCache: vi.fn().mockResolvedValue(true),
}));

vi.mock('../supabase', () => ({
  getServiceClient: vi.fn(),
}));

describe('getWebDashboardMetricsJson caching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns cached data if available', async () => {
    const mockMetrics = {
      tenants: { total: 10, active: 8, suspended: 1, demo: 1, failed: 0 },
      plans: { startup: 5, business: 3, enterprise: 0 },
      mrr: 1000,
      conversion: { onboard_started: 20, onboard_completed: 10, rate: 50 },
    };

    vi.mocked(redisCache.getCache).mockResolvedValue(mockMetrics);

    const result = await getWebDashboardMetricsJson();

    expect(result).toEqual(mockMetrics);
    expect(redisCache.getCache).toHaveBeenCalledWith('metrics:web_dashboard_json');
    expect(supabase.getServiceClient).not.toHaveBeenCalled();
  });

  it('fetches from Supabase and updates cache if not cached', async () => {
    vi.mocked(redisCache.getCache).mockResolvedValue(null);

    const mockChain = {
      schema: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((onfullfilled) => {
        return Promise.resolve(onfullfilled({ data: [], count: 5, error: null }));
      }),
    };

    vi.mocked(supabase.getServiceClient).mockReturnValue(mockChain as any);

    const result = await getWebDashboardMetricsJson();

    expect(result.tenants.total).toBe(5);
    expect(redisCache.getCache).toHaveBeenCalledWith('metrics:web_dashboard_json');
    expect(supabase.getServiceClient).toHaveBeenCalled();
    expect(redisCache.setCache).toHaveBeenCalledWith(
      'metrics:web_dashboard_json',
      expect.any(Object),
      60
    );
  });
});
