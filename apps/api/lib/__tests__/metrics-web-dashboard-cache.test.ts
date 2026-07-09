import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getWebDashboardMetricsJson } from '../metrics-web-dashboard';
import * as supabaseMod from '../supabase';
import * as redisCache from '../redis-cache';

vi.mock('../supabase', () => ({
  getServiceClient: vi.fn(),
}));

vi.mock('../redis-cache', () => ({
  getCache: vi.fn(),
  setCache: vi.fn(async () => true),
}));

describe('getWebDashboardMetricsJson caching', () => {
  const mockMetrics = {
    tenants: {
      total: 10,
      active: 7,
      suspended: 1,
      demo: 1,
      failed: 1,
    },
    plans: { startup: 2, business: 2, enterprise: 1 },
    mrr: 123.45,
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
    expect(supabaseMod.getServiceClient).not.toHaveBeenCalled();
  });

  it('fetches from Supabase on cache miss and sets cache', async () => {
    vi.mocked(redisCache.getCache).mockResolvedValue(null);

    const mockClient = {
      schema: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((onFulfilled) => {
        return Promise.resolve({ count: 5, data: [], error: null }).then(onFulfilled);
      }),
    };

    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(mockClient as any);

    const result = await getWebDashboardMetricsJson();

    expect(result).toBeDefined();
    expect(redisCache.getCache).toHaveBeenCalledWith('metrics:web_dashboard_json');
    expect(supabaseMod.getServiceClient).toHaveBeenCalled();
    // Wait a bit for the background setCache to be called
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(redisCache.setCache).toHaveBeenCalledWith('metrics:web_dashboard_json', expect.anything(), 60);
  });
});
