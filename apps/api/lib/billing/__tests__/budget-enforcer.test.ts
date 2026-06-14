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

vi.mock('../../supabase', () => ({ getServiceClient: () => ({ schema: mockSchema }) }));
vi.mock('../../redis-cache', () => ({ getCache: mockGetCache, setCache: mockSetCache }));
vi.mock('../../repositories/billing-usage-repository', () => ({
  BillingUsageRepository: class { sumSettledTotalAmountSince = mockSum; },
}));
vi.mock('../../tenant-context', () => ({ runWithTenantContext: <T>(_: any, fn: () => T) => fn() }));

describe('checkTenantBudget', () => {
  beforeEach(() => { vi.clearAllMocks(); mockGetCache.mockResolvedValue(null); });

  it('uses cache when available', async () => {
    mockGetCache.mockResolvedValueOnce({ tenantSlug: 'cached' });
    const r = await checkTenantBudget('t1');
    expect(r.tenantSlug).toBe('cached');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('sets cache on miss', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { id: 't1', slug: 's1' }, error: null }),
    });
    const r = await checkTenantBudget('t1');
    expect(mockSetCache).toHaveBeenCalledWith('budget:check:t1', r, CACHE_TTL.SHORT);
  });
});
