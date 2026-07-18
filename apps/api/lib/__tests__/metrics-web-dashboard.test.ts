import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getWebDashboardMetricsJson, type WebDashboardMetricsJson } from '../metrics-web-dashboard';
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
  const mockCached: WebDashboardMetricsJson = {
    tenants: {
      total: 10,
      active: 8,
      suspended: 1,
      demo: 2,
      failed: 1,
    },
    plans: {
      startup: 5,
      business: 2,
      enterprise: 1,
    },
    mrr: 247,
    conversion: {
      onboard_started: 20,
      onboard_completed: 10,
      rate: 50,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns cached metrics if available', async () => {
    vi.mocked(redisCache.getCache).mockResolvedValue(mockCached);

    const result = await getWebDashboardMetricsJson();

    expect(result).toEqual(mockCached);
    expect(redisCache.getCache).toHaveBeenCalledWith('metrics:web_dashboard_json');
    expect(supabase.getServiceClient).not.toHaveBeenCalled();
  });

  it('fetches from Supabase on cache miss and sets cache', async () => {
    vi.mocked(redisCache.getCache).mockResolvedValue(null);

    const mockClient = {
      schema() {
        return {
          from() {
            let isMrrQuery = false;
            let isOnboardCompletedQuery = false;
            let isOnboardStartedQuery = false;

            const chain = {
              select(columns: string) {
                if (columns === 'plan, is_demo') {
                  isMrrQuery = true;
                }
                return this;
              },
              is() {
                return this;
              },
              eq(col: string, val: unknown) {
                if (col === 'event' && val === 'onboard_completed') {
                  isOnboardCompletedQuery = true;
                } else if (col === 'event' && val === 'onboard_started') {
                  isOnboardStartedQuery = true;
                }
                return this;
              },
              gte() {
                return this;
              },
              then(resolve?: (value: unknown) => unknown) {
                let res: unknown;
                if (isMrrQuery) {
                  res = {
                    data: [
                      { plan: 'startup', is_demo: false },
                      { plan: 'business', is_demo: false },
                    ],
                    error: null,
                  };
                } else if (isOnboardCompletedQuery) {
                  res = { count: 5, error: null };
                } else if (isOnboardStartedQuery) {
                  res = { count: 10, error: null };
                } else {
                  res = { count: 2, error: null };
                }
                return Promise.resolve(resolve ? resolve(res) : res);
              },
            };
            return chain;
          },
        };
      },
    };

    vi.mocked(supabase.getServiceClient).mockReturnValue(
      mockClient as unknown as ReturnType<typeof supabase.getServiceClient>
    );

    const result = await getWebDashboardMetricsJson();

    expect(result).toBeDefined();
    expect(result.mrr).toBe(198); // 49 (startup) + 149 (business)
    expect(result.tenants.total).toBe(2);
    expect(result.conversion.onboard_started).toBe(10);
    expect(result.conversion.onboard_completed).toBe(5);
    expect(result.conversion.rate).toBe(50);

    expect(redisCache.setCache).toHaveBeenCalledWith(
      'metrics:web_dashboard_json',
      result,
      60 // CACHE_TTL.SHORT
    );
  });

  it('throws error if any query fails', async () => {
    vi.mocked(redisCache.getCache).mockResolvedValue(null);

    const errorMockClient = {
      schema() {
        return {
          from() {
            return {
              select() {
                return this;
              },
              is() {
                return this;
              },
              eq() {
                return this;
              },
              gte() {
                return this;
              },
              then(resolve?: (value: unknown) => unknown) {
                const res = { error: { message: 'Database failure' } };
                return Promise.resolve(resolve ? resolve(res) : res);
              },
            };
          },
        };
      },
    };

    vi.mocked(supabase.getServiceClient).mockReturnValue(
      errorMockClient as unknown as ReturnType<typeof supabase.getServiceClient>
    );

    await expect(getWebDashboardMetricsJson()).rejects.toThrow('Database failure');
  });
});
