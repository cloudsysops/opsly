import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFrom = vi.fn();
const mockSchema = vi.fn(() => ({ from: mockFrom }));

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

vi.mock('../../redis-cache', () => ({
  getCache: vi.fn(),
  setCache: vi.fn(),
}));

import { getCache, setCache } from '../../redis-cache';
import { checkTenantBudget } from '../budget-enforcer';

describe('checkTenantBudget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSum.mockResolvedValue({ value: 10, error: null });
    vi.mocked(getCache).mockResolvedValue(null);
  });

  it('returns cached result if available and skips DB queries', async () => {
    const cachedResult = {
      isOverBudget: true,
      currentSpend: 100,
      limit: 50,
      enforcementSkipped: false,
      tenantSlug: 'cached-tenant',
      tenantStatus: 'active' as any,
      budgetAutoSuspended: false,
    };
    vi.mocked(getCache).mockResolvedValue(cachedResult);

    const r = await checkTenantBudget('tid-cached');
    expect(r).toEqual(cachedResult);
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockSum).not.toHaveBeenCalled();
    expect(getCache).toHaveBeenCalledWith('budget:check:tid-cached');
  });

  it('saves result to cache on cache miss', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'tenants') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'tid-4', slug: 'acme', plan: 'startup', status: 'active', metadata: {} },
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

    await checkTenantBudget('tid-4');
    expect(getCache).toHaveBeenCalledWith('budget:check:tid-4');
    expect(setCache).toHaveBeenCalledWith('budget:check:tid-4', expect.any(Object), 60);
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
