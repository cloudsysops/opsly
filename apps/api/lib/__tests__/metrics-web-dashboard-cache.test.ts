import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getWebDashboardMetricsJson } from '../metrics-web-dashboard';
import * as supabaseMod from '../supabase';
import * as redisCacheMod from '../redis-cache';
import { CACHE_TTL } from '../constants';

vi.mock('../supabase', () => ({
  getServiceClient: vi.fn(),
}));

vi.mock('../redis-cache', () => ({
  getCache: vi.fn(),
  setCache: vi.fn().mockResolvedValue(true),
}));

const mockMetrics = {
  tenants: { total: 10, active: 8, suspended: 1, demo: 1, failed: 0 },
  plans: { startup: 5, business: 2, enterprise: 1 },
  mrr: 1000,
  conversion: { onboard_started: 100, onboard_completed: 80, rate: 80 },
};

describe('getWebDashboardMetricsJson caching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns cached metrics if available', async () => {
    vi.mocked(redisCacheMod.getCache).mockResolvedValue(mockMetrics);

    const result = await getWebDashboardMetricsJson();

    expect(result).toEqual(mockMetrics);
    expect(redisCacheMod.getCache).toHaveBeenCalledWith('metrics:web_dashboard_json');
    expect(supabaseMod.getServiceClient).not.toHaveBeenCalled();
  });

  it('fetches from Supabase and sets cache on miss', async () => {
    vi.mocked(redisCacheMod.getCache).mockResolvedValue(null);

    const mockClient = {
      schema: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue({ count: 5, data: [], error: null }),
    };

    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(mockClient as any);

    const result = await getWebDashboardMetricsJson();

    expect(result).toBeDefined();
    expect(redisCacheMod.getCache).toHaveBeenCalledWith('metrics:web_dashboard_json');
    expect(supabaseMod.getServiceClient).toHaveBeenCalled();
    expect(redisCacheMod.setCache).toHaveBeenCalledWith(
      'metrics:web_dashboard_json',
      expect.any(Object),
      CACHE_TTL.SHORT
    );
  });
});
