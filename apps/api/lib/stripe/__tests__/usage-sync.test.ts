import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncAllTenantsUsage } from '../usage-sync';
import type { UsageSyncResult, SyncDeps } from '../usage-sync';

// --- helpers para construir mocks de DB y Stripe -------------------------

function makeSupabase(tenantsData: unknown, usageData: unknown = []): SyncDeps['db'] {
  const mockFrom = vi.fn().mockImplementation((table: string) => {
    if (table === 'tenants') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: tenantsData, error: null }),
      };
    }
    // usage_events
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue({ data: usageData, error: null }),
    };
  });
  return { schema: vi.fn().mockReturnValue({ from: mockFrom }) } as unknown as SyncDeps['db'];
}

function makeStripe(
  overrides?: Partial<{
    retrieveResult: unknown;
    retrieveError: Error;
    createUsageRecord: ReturnType<typeof vi.fn>;
  }>
): SyncDeps['stripe'] {
  const createUsageRecord = overrides?.createUsageRecord ?? vi.fn().mockResolvedValue({});
  const retrieve = overrides?.retrieveError
    ? vi.fn().mockRejectedValue(overrides.retrieveError)
    : vi.fn().mockResolvedValue(overrides?.retrieveResult ?? {});
  return {
    subscriptions: { retrieve },
    subscriptionItems: { createUsageRecord },
  } as unknown as SyncDeps['stripe'];
}

// --- tests ---------------------------------------------------------------

describe('syncAllTenantsUsage', () => {
  beforeEach(() => {
    process.env.STRIPE_METERED_PRICE_ID_TOKENS = 'price_metered';
  });

  it('returns empty result when STRIPE_METERED_PRICE_ID_TOKENS is not set', async () => {
    delete process.env.STRIPE_METERED_PRICE_ID_TOKENS;
    const result: UsageSyncResult = await syncAllTenantsUsage();
    expect(result.tenants_synced).toBe(0);
    expect(result.tenants_skipped).toBe(0);
    expect(result.total_tokens).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('returns empty result when no active tenants', async () => {
    const result: UsageSyncResult = await syncAllTenantsUsage({
      db: makeSupabase([]),
      stripe: makeStripe(),
    });
    expect(result.tenants_synced).toBe(0);
    expect(result.tenants_skipped).toBe(0);
  });

  it('skips tenants without matching subscription item', async () => {
    const result: UsageSyncResult = await syncAllTenantsUsage({
      db: makeSupabase([{ slug: 'tenant-a', stripe_subscription_id: 'sub_1' }]),
      stripe: makeStripe({
        retrieveResult: {
          current_period_start: 1_700_000_000,
          items: { data: [{ id: 'si_x', price: { id: 'price_other' } }] },
        },
      }),
    });
    expect(result.tenants_skipped).toBe(1);
    expect(result.tenants_synced).toBe(0);
  });

  it('syncs tenant when metered item matches', async () => {
    const createUsageRecord = vi.fn().mockResolvedValue({});
    const result: UsageSyncResult = await syncAllTenantsUsage({
      db: makeSupabase(
        [{ slug: 'tenant-a', stripe_subscription_id: 'sub_1' }],
        [
          { tokens_input: 100, tokens_output: 50 },
          { tokens_input: 200, tokens_output: 100 },
        ]
      ),
      stripe: makeStripe({
        retrieveResult: {
          current_period_start: 1_700_000_000,
          items: { data: [{ id: 'si_match', price: { id: 'price_metered' } }] },
        },
        createUsageRecord,
      }),
    });
    expect(result.tenants_synced).toBe(1);
    expect(result.total_tokens).toBe(450);
    expect(createUsageRecord).toHaveBeenCalledWith(
      'si_match',
      expect.objectContaining({ quantity: 450, action: 'set' })
    );
  });

  it('collects errors without throwing', async () => {
    const result: UsageSyncResult = await syncAllTenantsUsage({
      db: makeSupabase([{ slug: 'bad-tenant', stripe_subscription_id: 'sub_fail' }]),
      stripe: makeStripe({ retrieveError: new Error('Stripe down') }),
    });
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('bad-tenant');
    expect(result.tenants_synced).toBe(0);
  });
});
