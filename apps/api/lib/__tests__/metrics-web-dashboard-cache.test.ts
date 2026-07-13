import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getWebDashboardMetricsJson } from '../metrics-web-dashboard';
import * as redisCache from '../redis-cache';
import * as supabaseLib from '../supabase';

vi.mock('../redis-cache', () => ({
  getCache: vi.fn(),
  setCache: vi.fn(async () => true),
}));

vi.mock('../supabase', () => ({
  getServiceClient: vi.fn(),
}));

vi.mock('../logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('getWebDashboardMetricsJson caching', () => {
  const mockMetrics = {
    tenants: { total: 10, active: 8, suspended: 1, demo: 1, failed: 0 },
    plans: { startup: 5, business: 2, enterprise: 1 },
    mrr: 1234,
    conversion: { onboard_started: 100, onboard_completed: 80, rate: 80 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns cached metrics if available', async () => {
    vi.mocked(redisCache.getCache).mockResolvedValue(mockMetrics);

    const result = await getWebDashboardMetricsJson();

    expect(result).toEqual(mockMetrics);
    expect(redisCache.getCache).toHaveBeenCalledWith('metrics:web_dashboard_json');
    expect(supabaseLib.getServiceClient).not.toHaveBeenCalled();
  });

  it('fetches from Supabase on cache miss and sets cache', async () => {
    vi.mocked(redisCache.getCache).mockResolvedValue(null);

    const mockChain = {
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

    vi.mocked(supabaseLib.getServiceClient).mockReturnValue(
      mockChain as unknown as ReturnType<typeof supabaseLib.getServiceClient>
    );

    const result = await getWebDashboardMetricsJson();

    expect(result).toBeDefined();
    expect(supabaseLib.getServiceClient).toHaveBeenCalled();
    expect(redisCache.setCache).toHaveBeenCalledWith(
      'metrics:web_dashboard_json',
      expect.anything(),
      expect.anything()
    );
  });
});
