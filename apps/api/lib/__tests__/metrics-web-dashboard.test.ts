import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getWebDashboardMetricsJson, type WebDashboardMetricsJson } from '../metrics-web-dashboard';
import { getServiceClient } from '../supabase';
import { getCache, setCache } from '../redis-cache';
import { CACHE_TTL } from '../constants';

vi.mock('../supabase', () => ({
  getServiceClient: vi.fn(),
}));

vi.mock('../redis-cache', () => ({
  getCache: vi.fn(),
  setCache: vi.fn(() => Promise.resolve(true)),
}));

interface MockBuilder {
  from: (table: string) => MockBuilder;
  select: (fields: string, options?: unknown) => MockBuilder;
  is: (col: string, val: unknown) => MockBuilder;
  eq: (col: string, val: unknown) => MockBuilder;
  gte: (col: string, val: unknown) => MockBuilder;
  then: <TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) => Promise<TResult1 | TResult2>;
}

function createSupabaseMockClient(mockResults: unknown[]): ReturnType<typeof getServiceClient> {
  let callIndex = 0;

  const client = {
    schema: (_name: string) => {
      const currentCallIndex = callIndex;
      callIndex += 1;

      const builder: MockBuilder = {
        from: (_table: string) => builder,
        select: (_fields: string, _options?: unknown) => builder,
        is: (_col: string, _val: unknown) => builder,
        eq: (_col: string, _val: unknown) => builder,
        gte: (_col: string, _val: unknown) => builder,
        then: <TResult1 = unknown, TResult2 = never>(
          onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
          _onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
        ) => {
          const result = mockResults[currentCallIndex];
          return Promise.resolve(result).then(onfulfilled) as Promise<TResult1 | TResult2>;
        },
      };

      return {
        from: (_table: string) => builder,
      };
    },
  };

  return client as unknown as ReturnType<typeof getServiceClient>;
}

describe('metrics-web-dashboard', () => {
  const mockCachedMetrics: WebDashboardMetricsJson = {
    tenants: {
      total: 100,
      active: 80,
      suspended: 15,
      demo: 3,
      failed: 2,
    },
    plans: {
      startup: 50,
      business: 20,
      enterprise: 10,
    },
    mrr: 12345,
    conversion: {
      onboard_started: 200,
      onboard_completed: 150,
      rate: 75.0,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getWebDashboardMetricsJson', () => {
    it('returns cached metrics on cache hit without calling DB', async () => {
      vi.mocked(getCache).mockResolvedValue(mockCachedMetrics);

      const result = await getWebDashboardMetricsJson();

      expect(result).toEqual(mockCachedMetrics);
      expect(getCache).toHaveBeenCalledWith('metrics:web_dashboard_json');
      expect(getServiceClient).not.toHaveBeenCalled();
    });

    it('aggregates metrics, sets cache, and returns result on cache miss', async () => {
      vi.mocked(getCache).mockResolvedValue(null);

      // We expect 11 mock query results in order:
      // 0: total count
      // 1: active count
      // 2: suspended count
      // 3: demo count
      // 4: failed count
      // 5: startup count
      // 6: business count
      // 7: enterprise count
      // 8: plan and is_demo for active tenants
      // 9: onboard_started conversion events
      // 10: onboard_completed conversion events
      const mockQueryResults = [
        { count: 10, error: null }, // 0: total
        { count: 6, error: null }, // 1: active
        { count: 2, error: null }, // 2: suspended
        { count: 1, error: null }, // 3: demo
        { count: 1, error: null }, // 4: failed
        { count: 3, error: null }, // 5: startup
        { count: 2, error: null }, // 6: business
        { count: 1, error: null }, // 7: enterprise
        {
          data: [
            { plan: 'startup', is_demo: false },
            { plan: 'business', is_demo: false },
            { plan: 'enterprise', is_demo: false },
            { plan: 'demo', is_demo: true },
          ],
          error: null,
        }, // 8: active paid
        { count: 50, error: null }, // 9: conversion started
        { count: 25, error: null }, // 10: conversion completed
      ];

      const mockClient = createSupabaseMockClient(mockQueryResults);
      vi.mocked(getServiceClient).mockReturnValue(mockClient);

      const result = await getWebDashboardMetricsJson();

      const expectedMetrics: WebDashboardMetricsJson = {
        tenants: {
          total: 10,
          active: 6,
          suspended: 2,
          demo: 1,
          failed: 1,
        },
        plans: {
          startup: 3,
          business: 2,
          enterprise: 1,
        },
        mrr: 49 + 149 + 499, // 697
        conversion: {
          onboard_started: 50,
          onboard_completed: 25,
          rate: 50,
        },
      };

      expect(result).toEqual(expectedMetrics);
      expect(getCache).toHaveBeenCalledWith('metrics:web_dashboard_json');
      expect(setCache).toHaveBeenCalledWith(
        'metrics:web_dashboard_json',
        expectedMetrics,
        CACHE_TTL.SHORT
      );
    });

    it('throws error if any database query fails', async () => {
      vi.mocked(getCache).mockResolvedValue(null);

      const mockQueryResults = [
        { count: null, error: { message: 'Database connection failed' } },
        { count: 6, error: null },
        { count: 2, error: null },
        { count: 1, error: null },
        { count: 1, error: null },
        { count: 3, error: null },
        { count: 2, error: null },
        { count: 1, error: null },
        { data: [], error: null },
        { count: 50, error: null },
        { count: 25, error: null },
      ];

      const mockClient = createSupabaseMockClient(mockQueryResults);
      vi.mocked(getServiceClient).mockReturnValue(mockClient);

      await expect(getWebDashboardMetricsJson()).rejects.toThrow('Database connection failed');
    });
  });
});
