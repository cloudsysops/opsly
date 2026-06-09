import { beforeEach, describe, expect, it } from 'vitest';
import { ReferralService } from '../referral.service';

type Row = Record<string, unknown> & { id: string };

function createFakeDb() {
  const state = {
    referral_links: [] as Row[],
    referral_clicks: [] as Row[],
    referral_redemptions: [] as Row[],
  };

  const now = new Date('2026-06-04T00:00:00.000Z').getTime();
  let idSeq = 0;
  const makeId = (): string => `row-${++idSeq}`;

  function matches(row: Row, filters: Array<[string, unknown]>): boolean {
    return filters.every(([key, value]) => row[key] === value);
  }

  function exec(table: keyof typeof state, op: 'select' | 'insert' | 'update', payload?: unknown, filters: Array<[string, unknown]> = [], head = false, countMode = false) {
    const rows = state[table];
    if (op === 'insert') {
      const items = Array.isArray(payload) ? payload : [payload];
      const inserted = items.map((item) => {
        const row = { id: makeId(), ...(item as Record<string, unknown>) } as Row;
        rows.push(row);
        return row;
      });
      return { data: inserted, count: inserted.length, error: null };
    }

    const filtered = rows.filter((row) => matches(row, filters));
    if (op === 'update') {
      const updated = filtered.map((row) => Object.assign(row, payload as Record<string, unknown>));
      return { data: updated, count: updated.length, error: null };
    }

    if (countMode) {
      return { data: null, count: filtered.length, error: null };
    }

    return { data: head ? null : filtered, count: filtered.length, error: null };
  }

  function from(table: keyof typeof state) {
    const filters: Array<[string, unknown]> = [];
    let op: 'select' | 'insert' | 'update' = 'select';
    let payload: unknown;
    let head = false;
    let countMode = false;
    return {
      select(_cols?: string, opts?: { head?: boolean; count?: 'exact' }) {
        head = Boolean(opts?.head);
        countMode = opts?.count === 'exact';
        return this;
      },
      insert(value: unknown) {
        op = 'insert';
        payload = value;
        return this;
      },
      update(value: unknown) {
        op = 'update';
        payload = value;
        return this;
      },
      eq(column: string, value: unknown) {
        filters.push([column, value]);
        return this;
      },
      maybeSingle() {
        const result = exec(table, op, payload, filters, false, countMode);
        const row = Array.isArray(result.data) ? result.data[0] ?? null : result.data;
        return Promise.resolve({ data: row, error: result.error, count: result.count });
      },
      single() {
        const result = exec(table, op, payload, filters, false, countMode);
        const row = Array.isArray(result.data) ? result.data[0] ?? null : result.data;
        return Promise.resolve({ data: row, error: result.error, count: result.count });
      },
      then(resolve: (value: unknown) => unknown) {
        const result = exec(table, op, payload, filters, head, countMode);
        return Promise.resolve(resolve(result));
      },
    };
  }

  return {
    from,
    state,
    now,
  };
}

describe('ReferralService', () => {
  let db: ReturnType<typeof createFakeDb>;
  let service: ReferralService;

  beforeEach(() => {
    db = createFakeDb();
    service = new ReferralService(db as unknown as never);
  });

  it('generates a scoped referral link', async () => {
    const link = await service.generateReferralLink('ref-1', 'Maria');
    expect(link.referrer_id).toBe('ref-1');
    expect(link.code).toMatch(/^PESKIDS_/);
    expect(db.state.referral_links).toHaveLength(1);
  });

  it('tracks clicks and rejects unknown codes', async () => {
    const link = await service.generateReferralLink('ref-1', 'Maria');
    await service.trackReferralClick(link.code, '127.0.0.1', 'UA');
    expect(db.state.referral_clicks).toHaveLength(1);
    await expect(service.trackReferralClick('BAD', '127.0.0.1', 'UA')).rejects.toThrow(
      'Invalid referral code'
    );
  });

  it('redeems and completes referrals', async () => {
    const link = await service.generateReferralLink('ref-1', 'Maria');
    const redemption = await service.redeemReferral(link.code, 'ref-2', 'a@example.com');
    expect(redemption.status).toBe('pending');
    const completed = await service.completeReferralRedemption(redemption.id, '1 free class');
    expect(completed.status).toBe('completed');
    expect(completed.reward).toBe('1 free class');
  });

  it('prevents self-referrals', async () => {
    const link = await service.generateReferralLink('ref-1', 'Maria');
    await expect(service.redeemReferral(link.code, 'ref-1', 'a@example.com')).rejects.toThrow(
      'Cannot redeem own referral link'
    );
  });

  it('returns aggregated stats', async () => {
    const link = await service.generateReferralLink('ref-1', 'Maria');
    await service.trackReferralClick(link.code, '127.0.0.1', 'UA');
    const redemption = await service.redeemReferral(link.code, 'ref-2', 'a@example.com');
    await service.completeReferralRedemption(redemption.id, 'reward');

    const stats = await service.getReferralStats('ref-1');
    expect(stats.totalLinks).toBe(1);
    expect(stats.linksActive).toBe(1);
    expect(stats.totalClicks).toBe(1);
    expect(stats.totalRedemptions).toBe(1);
    expect(stats.completedRedemptions).toBe(1);
  });
});
