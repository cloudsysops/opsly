import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CACHE_TTL } from '../../constants';
import { checkTenantBudget } from '../budget-enforcer';

const { mockFrom, mockSchema, mockGetCache, mockSetCache, mockSum } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockSchema: vi.fn(() => ({ from: vi.fn() })),
  mockGetCache: vi.fn().mockResolvedValue(null),
  mockSetCache: vi.fn(),
  mockSum: vi.fn().mockResolvedValue({ value: 10, error: null }),
}));
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
    expect(mockSetCache).toHaveBeenCalledWith('budget:check:tid-new', r, CACHE_TTL.SHORT);
  });
});
