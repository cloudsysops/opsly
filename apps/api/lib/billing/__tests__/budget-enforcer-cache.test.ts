import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../redis-cache', () => ({
  getCache: vi.fn(),
  setCache: vi.fn(),
}));

// Re-import after mock to get the mocked versions
import { getCache, setCache } from '../../redis-cache';

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

describe('checkTenantBudget caching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns cached result if available and skips DB calls', async () => {
    const cachedResult = {
      isOverBudget: false,
      currentSpend: 50,
      limit: 100,
      enforcementSkipped: false,
      tenantSlug: 'cached-tenant',
      tenantStatus: 'active',
      budgetAutoSuspended: false,
    };
    vi.mocked(getCache).mockResolvedValue(cachedResult);

    const result = await checkTenantBudget('tenant-123');

    expect(result).toEqual(cachedResult);
    expect(getCache).toHaveBeenCalledWith('tenant:budget:check:tenant-123');
    expect(mockSchema).not.toHaveBeenCalled();
    expect(mockSum).not.toHaveBeenCalled();
  });

  it('fetches from DB and stores in cache if not cached', async () => {
    vi.mocked(getCache).mockResolvedValue(null);
    mockSum.mockResolvedValue({ value: 20, error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'tenants') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: 'tenant-456',
              slug: 'new-tenant',
              plan: 'pro',
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
            data: { monthly_cap_usd: 100 },
            error: null,
          }),
        };
      }
      return {};
    });

    const result = await checkTenantBudget('tenant-456');

    expect(result.currentSpend).toBe(20);
    expect(getCache).toHaveBeenCalledWith('tenant:budget:check:tenant-456');
    expect(setCache).toHaveBeenCalledWith(
      'tenant:budget:check:tenant-456',
      expect.objectContaining({ currentSpend: 20 }),
      60 // CACHE_TTL.SHORT
    );
  });
});
