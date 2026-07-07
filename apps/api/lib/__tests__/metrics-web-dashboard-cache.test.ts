import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getWebDashboardMetricsJson } from '../metrics-web-dashboard';
import * as redisCache from '../redis-cache';
import * as supabaseMod from '../supabase';

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
    const mockCached = {
      tenants: { total: 10, active: 5, suspended: 1, demo: 2, failed: 2 },
      plans: { startup: 2, business: 2, enterprise: 1 },
      mrr: 1000,
      conversion: { onboard_started: 10, onboard_completed: 5, rate: 50 },
    };
    vi.mocked(redisCache.getCache).mockResolvedValue(mockCached);

    const result = await getWebDashboardMetricsJson();

    expect(result).toEqual(mockCached);
    expect(redisCache.getCache).toHaveBeenCalledWith('metrics:web_dashboard_json');
    expect(supabaseMod.getServiceClient).not.toHaveBeenCalled();
  });

  it('fetches from DB and sets cache if not in cache', async () => {
    vi.mocked(redisCache.getCache).mockResolvedValue(null);

    const mockCount = { count: 10, error: null };
    const mockData = { data: [], error: null };

    const mockClient = {
      schema: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnValue(Promise.resolve(mockCount)),
      maybeSingle: vi.fn(),
    } as any;

    // Adjusting for the fact that some queries use Promise.all and have different terminal methods
    // In buildMetricsQueries:
    // queries 0-7, 9, 10 use .is() or .eq() then return the builder which is awaited (implicitly .then())
    // query 8 uses .eq() then return the builder which is awaited.

    mockClient.is.mockReturnValue({
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      then: (onFulfilled: any) => onFulfilled(mockCount),
    });

    mockClient.eq.mockReturnValue({
      gte: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      then: (onFulfilled: any) => onFulfilled(mockData), // For query 8
    });

    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(mockClient);

    await getWebDashboardMetricsJson();

    expect(redisCache.getCache).toHaveBeenCalledWith('metrics:web_dashboard_json');
    expect(supabaseMod.getServiceClient).toHaveBeenCalled();
    expect(redisCache.setCache).toHaveBeenCalledWith(
      'metrics:web_dashboard_json',
      expect.any(Object),
      60
    );
  });
});
