import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../summary/route';
import { getCache, setCache } from '../../../../../lib/redis-cache';
import { runTrustedPortalDal } from '../../../../../lib/portal-tenant-dal';
import { getTenantContext } from '../../../../../lib/tenant-context';
import { BillingUsageRepository } from '../../../../../lib/repositories/billing-usage-repository';
import { sumPendingRedisUsageUsd } from '../../../../../lib/portal-billing-summary';

vi.mock('../../../../../lib/redis-cache', () => ({
  getCache: vi.fn(),
  setCache: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../../../../lib/portal-tenant-dal', () => ({
  runTrustedPortalDal: vi.fn((_req, handler) => handler({ tenant: { id: 'tenant-123', slug: 'acme' } })),
}));

vi.mock('../../../../../lib/tenant-context', () => ({
  getTenantContext: vi.fn().mockReturnValue({ tenantId: 'tenant-123' }),
}));

const mockSumSettledTotalAmountSince = vi.fn();

vi.mock('../../../../../lib/repositories/billing-usage-repository', () => {
  return {
    BillingUsageRepository: vi.fn().mockImplementation(function (this: { sumSettledTotalAmountSince: typeof mockSumSettledTotalAmountSince }) {
      this.sumSettledTotalAmountSince = mockSumSettledTotalAmountSince;
    }),
  };
});

vi.mock('../../../../../lib/portal-billing-summary', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../../lib/portal-billing-summary')>();
  return {
    ...actual,
    sumPendingRedisUsageUsd: vi.fn(),
  };
});

describe('GET /api/portal/billing/summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTenantContext).mockReturnValue({ tenantId: 'tenant-123' } as ReturnType<typeof getTenantContext>);
  });

  it('returns cached payload directly on Redis cache hit', async () => {
    const cachedPayload = {
      period_start: '2026-08-01',
      period_end: '2026-08-31',
      currency: 'USD',
      settled_cost_usd: 10.5,
      pending_cost_usd: 2.25,
      current_total_usd: 12.75,
      projected_month_end_usd: 15.0,
      daily_average_usd: 0.5,
    };

    vi.mocked(getCache).mockResolvedValue(cachedPayload);

    const req = new Request('http://localhost/api/portal/billing/summary');
    const response = await GET(req);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(cachedPayload);
    expect(getCache).toHaveBeenCalledWith('portal:billing_summary:tenant-123');
    expect(BillingUsageRepository).not.toHaveBeenCalled();
    expect(sumPendingRedisUsageUsd).not.toHaveBeenCalled();
  });

  it('computes summary, populates Redis cache, and returns summary on cache miss', async () => {
    vi.mocked(getCache).mockResolvedValue(null);
    mockSumSettledTotalAmountSince.mockResolvedValue({ value: 100, error: null });
    vi.mocked(sumPendingRedisUsageUsd).mockResolvedValue(20);

    const req = new Request('http://localhost/api/portal/billing/summary');
    const response = await GET(req);

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.currency).toBe('USD');
    expect(body.settled_cost_usd).toBe(100);
    expect(body.pending_cost_usd).toBe(20);
    expect(body.current_total_usd).toBe(120);

    expect(getCache).toHaveBeenCalledWith('portal:billing_summary:tenant-123');
    expect(mockSumSettledTotalAmountSince).toHaveBeenCalled();
    expect(sumPendingRedisUsageUsd).toHaveBeenCalledWith('tenant-123');
    expect(setCache).toHaveBeenCalledWith('portal:billing_summary:tenant-123', expect.objectContaining({
      settled_cost_usd: 100,
      pending_cost_usd: 20,
      current_total_usd: 120,
    }), 60);
  });

  it('returns 500 when Supabase DB fails to retrieve settled billing', async () => {
    vi.mocked(getCache).mockResolvedValue(null);
    mockSumSettledTotalAmountSince.mockResolvedValue({ value: 0, error: new Error('DB connection error') });

    const req = new Request('http://localhost/api/portal/billing/summary');
    const response = await GET(req);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: 'billing_summary_db_failed' });
    expect(setCache).not.toHaveBeenCalled();
  });
});
