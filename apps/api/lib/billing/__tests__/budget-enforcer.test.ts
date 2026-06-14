import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFrom, mockSchema, mockGetCache, mockSetCache, mockSum } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockSchema: vi.fn(() => ({ from: vi.fn() })), // This will be updated below
  mockGetCache: vi.fn(),
  mockSetCache: vi.fn(),
  mockSum: vi.fn(),
}));

// Re-setup mockSchema properly to use the hoisted mockFrom
mockSchema.mockReturnValue({ from: mockFrom });

vi.mock('../../supabase', () => ({
  getServiceClient: () => ({
    schema: mockSchema,
  }),
}));

vi.mock('../../redis-cache', () => ({
  getCache: mockGetCache,
  setCache: mockSetCache,
}));

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
    mockGetCache.mockResolvedValue(null);
    mockSetCache.mockResolvedValue(true);
  });

  it('returns cached value if present', async () => {
    const cachedResult = {
      isOverBudget: false,
      currentSpend: 5,
      limit: 100,
      enforcementSkipped: false,
      tenantSlug: 'cached-slug',
      tenantStatus: 'active',
      budgetAutoSuspended: false,
    };
    mockGetCache.mockResolvedValue(cachedResult);

    const r = await checkTenantBudget('tid-cached');
    expect(r).toEqual(cachedResult);
    expect(mockGetCache).toHaveBeenCalledWith('budget:check:tid-cached');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('sets cache when result is not cached', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'tenants') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'tid-new', slug: 'new-slug', plan: 'pro', status: 'active', metadata: {} },
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

    const r = await checkTenantBudget('tid-new');
    expect(r.tenantSlug).toBe('new-slug');
    expect(mockGetCache).toHaveBeenCalledWith('budget:check:tid-new');
    expect(mockSetCache).toHaveBeenCalledWith('budget:check:tid-new', r, 60);
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
  });
});
