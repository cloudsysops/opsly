import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getWebDashboardMetricsJson } from '../metrics-web-dashboard';
import * as supabaseMod from '../supabase';
import * as redisMod from '../redis-cache';

vi.mock('../supabase', () => ({
  getServiceClient: vi.fn(),
}));

vi.mock('../redis-cache', () => ({
  getCache: vi.fn(),
  setCache: vi.fn(),
}));

describe('getWebDashboardMetricsJson caching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns cached value if present', async () => {
    const mockMetrics = {
      tenants: { total: 10, active: 5, suspended: 1, demo: 2, failed: 2 },
      plans: { startup: 2, business: 2, enterprise: 1 },
      mrr: 100,
      conversion: { onboard_started: 10, onboard_completed: 5, rate: 50 },
    };
    vi.mocked(redisMod.getCache).mockResolvedValue(mockMetrics);

    const result = await getWebDashboardMetricsJson();

    expect(result).toEqual(mockMetrics);
    expect(redisMod.getCache).toHaveBeenCalledWith('metrics:web_dashboard_json');
    expect(supabaseMod.getServiceClient).not.toHaveBeenCalled();
  });

  it('fetches from DB and sets cache if not present', async () => {
    vi.mocked(redisMod.getCache).mockResolvedValue(null);

    const mockClient = {
      schema: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(),
      then: vi.fn((onFulfilled) => onFulfilled({ count: 5, data: [], error: null })),
    };

    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(mockClient as any);

    const result = await getWebDashboardMetricsJson();

    expect(redisMod.getCache).toHaveBeenCalledWith('metrics:web_dashboard_json');
    expect(supabaseMod.getServiceClient).toHaveBeenCalled();
    expect(redisMod.setCache).toHaveBeenCalledWith(
      'metrics:web_dashboard_json',
      expect.any(Object),
      expect.any(Number)
    );
    expect(result.tenants.total).toBe(5);
  });
});
