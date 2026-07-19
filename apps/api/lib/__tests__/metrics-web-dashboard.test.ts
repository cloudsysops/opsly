import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getWebDashboardMetricsJson } from '../metrics-web-dashboard';
import { getServiceClient } from '../supabase';
import { getCache, setCache } from '../redis-cache';
import { CACHE_TTL } from '../constants';

vi.mock('../supabase', () => ({
  getServiceClient: vi.fn(),
}));

vi.mock('../redis-cache', () => ({
  getCache: vi.fn(),
  setCache: vi.fn(),
}));

interface Filter {
  type: 'is' | 'eq' | 'gte';
  field: string;
  value: string | boolean;
}

class MockChain {
  private schemaName: string;
  private tableName: string;
  private filters: Filter[] = [];
  private shouldError = false;

  constructor(schema: string, table: string, shouldError = false) {
    this.schemaName = schema;
    this.tableName = table;
    this.shouldError = shouldError;
  }

  select(columns: string, options?: { count?: string; head?: boolean }) {
    return this;
  }

  is(field: string, value: string | null) {
    this.filters.push({ type: 'is', field, value: value ?? '' });
    return this;
  }

  eq(field: string, value: string | boolean) {
    this.filters.push({ type: 'eq', field, value });
    return this;
  }

  gte(field: string, value: string) {
    this.filters.push({ type: 'gte', field, value });
    return this;
  }

  then(
    onFulfilled: (value: {
      count: number | null;
      data: Array<{ plan: string; is_demo: boolean }> | null;
      error: unknown;
    }) => unknown,
    onRejected?: (error: unknown) => unknown
  ) {
    if (this.shouldError) {
      return Promise.resolve({
        count: null,
        data: null,
        error: { message: 'db error' },
      }).then(onFulfilled, onRejected);
    }

    let count = 0;
    let data: Array<{ plan: string; is_demo: boolean }> | null = null;

    if (this.tableName === 'tenants') {
      const statusFilter = this.filters.find((f) => f.field === 'status');
      const isDemoFilter = this.filters.find((f) => f.field === 'is_demo');
      const planFilter = this.filters.find((f) => f.field === 'plan');

      if (planFilter) {
        if (planFilter.value === 'startup') count = 2;
        else if (planFilter.value === 'business') count = 3;
        else if (planFilter.value === 'enterprise') count = 4;
      } else if (statusFilter) {
        if (statusFilter.value === 'active') {
          count = 7;
          data = [
            { plan: 'startup', is_demo: false },
            { plan: 'business', is_demo: false },
            { plan: 'enterprise', is_demo: false },
            { plan: 'demo', is_demo: true },
          ];
        } else if (statusFilter.value === 'suspended') {
          count = 1;
        } else if (statusFilter.value === 'failed') {
          count = 0;
        }
      } else if (isDemoFilter) {
        if (isDemoFilter.value === true) count = 1;
      } else {
        count = 10;
      }
    } else if (this.tableName === 'conversion_events') {
      const eventFilter = this.filters.find((f) => f.field === 'event');
      if (eventFilter) {
        if (eventFilter.value === 'onboard_started') count = 20;
        else if (eventFilter.value === 'onboard_completed') count = 10;
      }
    }

    return Promise.resolve({ count, data, error: null }).then(onFulfilled, onRejected);
  }
}

describe('getWebDashboardMetricsJson', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return cached data on cache hit', async () => {
    const cachedData = {
      tenants: { total: 10, active: 7, suspended: 1, demo: 1, failed: 0 },
      plans: { startup: 2, business: 3, enterprise: 4 },
      mrr: 697,
      conversion: { onboard_started: 20, onboard_completed: 10, rate: 50 },
    };
    vi.mocked(getCache).mockResolvedValue(cachedData);

    const result = await getWebDashboardMetricsJson();

    expect(result).toEqual(cachedData);
    expect(getCache).toHaveBeenCalledWith('metrics:web_dashboard_json');
    expect(getServiceClient).not.toHaveBeenCalled();
  });

  it('should fetch from database and cache results on cache miss', async () => {
    vi.mocked(getCache).mockResolvedValue(null);

    const mockSchemaFn = vi.fn((schema: string) => ({
      from: vi.fn((table: string) => new MockChain(schema, table)),
    }));

    vi.mocked(getServiceClient).mockReturnValue({
      schema: mockSchemaFn,
    } as unknown as ReturnType<typeof getServiceClient>);

    const result = await getWebDashboardMetricsJson();

    // Expected compiled metrics:
    // MRR = startup (49) + business (149) + enterprise (499) = 697 (demo ignored)
    // Conversion rate = 10 / 20 = 50%
    expect(result).toEqual({
      tenants: { total: 10, active: 7, suspended: 1, demo: 1, failed: 0 },
      plans: { startup: 2, business: 3, enterprise: 4 },
      mrr: 697,
      conversion: { onboard_started: 20, onboard_completed: 10, rate: 50 },
    });

    expect(getCache).toHaveBeenCalledWith('metrics:web_dashboard_json');
    expect(getServiceClient).toHaveBeenCalled();
    expect(setCache).toHaveBeenCalledWith('metrics:web_dashboard_json', result, CACHE_TTL.SHORT);
  });

  it('should throw error if any database query fails', async () => {
    vi.mocked(getCache).mockResolvedValue(null);

    // Let schema return a mock chain that errors
    const mockSchemaFn = vi.fn((schema: string) => ({
      from: vi.fn((table: string) => new MockChain(schema, table, true)),
    }));

    vi.mocked(getServiceClient).mockReturnValue({
      schema: mockSchemaFn,
    } as unknown as ReturnType<typeof getServiceClient>);

    await expect(getWebDashboardMetricsJson()).rejects.toThrow('db error');
  });
});
