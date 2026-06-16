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

import { checkTenantBudget } from '../budget-enforcer';

describe('checkTenantBudget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSum.mockResolvedValue({ value: 10, error: null });
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
