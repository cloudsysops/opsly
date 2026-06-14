import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFrom = vi.fn();
const mockSchema = vi.fn(() => ({ from: mockFrom }));

// Mocking getCache/setCache using vi.hoisted to ensure they are available for the module factory
const { mockGetCache, mockSetCache } = vi.hoisted(() => ({
  mockGetCache: vi.fn(),
  mockSetCache: vi.fn(),
}));

vi.mock('../../redis-cache', () => ({
  getCache: mockGetCache,
  setCache: mockSetCache,
  CACHE_TTL: {
    SHORT: 60,
  },
}));

vi.mock('../../supabase', () => ({
  getServiceClient: () => ({
    schema: mockSchema,
  }),
}));

const mockSum = vi.fn();
vi.mock('../../repositories/billing-usage-repository', () => ({
  BillingUsageRepository: class {
    sumSettledTotalAmountSince = mockSum;
  },
}));

vi.mock('../../tenant-context', () => ({
  runWithTenantContext: <T>(_ctx: unknown, fn: () => T | Promise<T>) => fn(),
}));

import { checkTenantBudget } from '../budget-enforcer';

describe('checkTenantBudget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSum.mockResolvedValue({ value: 10, error: null });
    // Default to cache miss
    mockGetCache.mockResolvedValue(null);
  });

  it('returns cached value if present and avoids DB calls', async () => {
    const cachedResult = {
      isOverBudget: false,
      currentSpend: 50,
      limit: 100,
      enforcementSkipped: false,
      tenantSlug: 'cached-tenant',
      tenantStatus: 'active',
      budgetAutoSuspended: false,
    };
    mockGetCache.mockResolvedValueOnce(cachedResult);

    const result = await checkTenantBudget('tid-cache');

    expect(result).toEqual(cachedResult);
    expect(mockGetCache).toHaveBeenCalledWith('budget:check:tid-cache');
    // Ensure no DB calls were made
    expect(mockSchema).not.toHaveBeenCalled();
  });

  it('returns enforcementSkipped when slug is in BUDGET_ENFORCEMENT_BYPASS_SLUGS', async () => {
    process.env.BUDGET_ENFORCEMENT_BYPASS_SLUGS = 'acme,ops';

    mockFrom.mockImplementation((table: string) => {
      if (table === 'tenants') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: 'tid-1',
              slug: 'ops',
              plan: 'enterprise',
              status: 'active',
              metadata: {},
            },
            error: null,
          }),
        };
      }
      if (table === 'tenant_budgets') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      return {};
    });

    const r = await checkTenantBudget('tid-1');
    expect(r.enforcementSkipped).toBe(true);
    expect(r.isOverBudget).toBe(false);
    expect(mockSum).toHaveBeenCalled();
    // Verify cache update
    expect(mockSetCache).toHaveBeenCalledWith('budget:check:tid-1', r, 60);
    delete process.env.BUDGET_ENFORCEMENT_BYPASS_SLUGS;
  });

  it('computes isOverBudget from billing_usage sum vs tenant_budgets cap', async () => {
    delete process.env.BUDGET_ENFORCEMENT_BYPASS_SLUGS;

    mockFrom.mockImplementation((table: string) => {
      if (table === 'tenants') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: 'tid-2',
              slug: 'acme',
              plan: 'startup',
              status: 'active',
              metadata: {},
            },
            error: null,
          }),
        };
      }
      if (table === 'tenant_budgets') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { monthly_cap_usd: 5 },
            error: null,
          }),
        };
      }
      return {};
    });

    mockSum.mockResolvedValue({ value: 10, error: null });

    const r = await checkTenantBudget('tid-2');
    expect(r.limit).toBe(5);
    expect(r.currentSpend).toBe(10);
    expect(r.isOverBudget).toBe(true);
    expect(r.enforcementSkipped).toBe(false);
    // Verify cache update
    expect(mockSetCache).toHaveBeenCalledWith('budget:check:tid-2', r, 60);
  });

  it('treats missing billing_usage table as 0 spend (migration not applied)', async () => {
    delete process.env.BUDGET_ENFORCEMENT_BYPASS_SLUGS;

    mockFrom.mockImplementation((table: string) => {
      if (table === 'tenants') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: 'tid-3',
              slug: 'acme',
              plan: 'startup',
              status: 'active',
              metadata: {},
            },
            error: null,
          }),
        };
      }
      if (table === 'tenant_budgets') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      return {};
    });

    mockSum.mockResolvedValue({
      value: 0,
      error: new Error("Could not find the table 'platform.billing_usage' in the schema cache"),
    });

    const r = await checkTenantBudget('tid-3');
    expect(r.currentSpend).toBe(0);
    expect(r.isOverBudget).toBe(false);
    // Verify cache update even on aggregation errors (assuming we want to cache the "safe" result)
    expect(mockSetCache).toHaveBeenCalledWith('budget:check:tid-3', r, 60);
  });
});
