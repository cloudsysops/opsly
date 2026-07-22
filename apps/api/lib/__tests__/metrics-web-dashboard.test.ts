import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getWebDashboardMetricsJson } from '../metrics-web-dashboard';
import * as redisCache from '../redis-cache';
import * as supabase from '../supabase';

vi.mock('../redis-cache', () => ({
  getCache: vi.fn(),
  setCache: vi.fn(async () => true),
}));

interface MockChain {
  select: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  then?: ReturnType<typeof vi.fn>;
}

const mockSelect = vi.fn();
const mockIs = vi.fn();
const mockEq = vi.fn();
const mockGte = vi.fn();

const mockQueryBuilder: MockChain = {
  select: mockSelect,
  is: mockIs,
  eq: mockEq,
  gte: mockGte,
};

// Chain helper mocks
mockSelect.mockReturnValue(mockQueryBuilder);
mockIs.mockReturnValue(mockQueryBuilder);
mockEq.mockReturnValue(mockQueryBuilder);
mockGte.mockReturnValue(mockQueryBuilder);

vi.mock('../supabase', () => ({
  getServiceClient: vi.fn(() => ({
    schema: vi.fn(() => ({
      from: vi.fn(() => mockQueryBuilder),
    })),
  })),
}));

describe('getWebDashboardMetricsJson', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete mockQueryBuilder.then;
  });

  it('returns cached metrics immediately on cache hit', async () => {
    const cachedMetrics = {
      tenants: { total: 10, active: 8, suspended: 1, demo: 1, failed: 0 },
      plans: { startup: 5, business: 2, enterprise: 1 },
      mrr: 1541,
      conversion: { onboard_started: 100, onboard_completed: 80, rate: 80 },
    };

    vi.mocked(redisCache.getCache).mockResolvedValue(cachedMetrics);

    const result = await getWebDashboardMetricsJson();

    expect(result).toEqual(cachedMetrics);
    expect(redisCache.getCache).toHaveBeenCalledWith('metrics:web_dashboard_json');
    expect(supabase.getServiceClient).not.toHaveBeenCalled();
  });

  it('queries database and caches result on cache miss', async () => {
    vi.mocked(redisCache.getCache).mockResolvedValue(null);

    mockSelect.mockImplementation((_sel, opts) => {
      if (opts?.count === 'exact') {
        return mockQueryBuilder;
      }
      return mockQueryBuilder;
    });

    const queryResults = [
      { count: 12, error: null }, // total tenants
      { count: 10, error: null }, // active tenants
      { count: 1, error: null }, // suspended tenants
      { count: 1, error: null }, // demo tenants
      { count: 0, error: null }, // failed tenants
      { count: 6, error: null }, // startup plan count
      { count: 3, error: null }, // business plan count
      { count: 1, error: null }, // enterprise plan count
      {
        data: [
          { plan: 'startup', is_demo: false },
          { plan: 'business', is_demo: false },
        ],
        error: null,
      }, // active paid plans for MRR
      { count: 20, error: null }, // onboard_started count
      { count: 10, error: null }, // onboard_completed count
    ];

    let callIndex = 0;
    const thenMock = vi.fn().mockImplementation(function (onfulfilled: (val: unknown) => unknown) {
      const res = queryResults[callIndex++];
      return Promise.resolve(onfulfilled(res));
    });

    mockQueryBuilder.then = thenMock;

    const result = await getWebDashboardMetricsJson();

    expect(result.tenants.total).toBe(12);
    expect(result.tenants.active).toBe(10);
    expect(result.plans.startup).toBe(6);
    expect(result.plans.business).toBe(3);
    expect(result.plans.enterprise).toBe(1);
    expect(result.mrr).toBe(PLAN_MRR_USD_CALC()); // startup (49) + business (149) = 198
    expect(result.conversion.onboard_started).toBe(20);
    expect(result.conversion.onboard_completed).toBe(10);
    expect(result.conversion.rate).toBe(50); // 10/20 = 50%

    expect(redisCache.setCache).toHaveBeenCalledWith('metrics:web_dashboard_json', result, 60);
  });
});

function PLAN_MRR_USD_CALC(): number {
  return 49 + 149;
}
