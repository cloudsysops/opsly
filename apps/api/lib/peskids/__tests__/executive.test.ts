import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getServiceClientMock = vi.fn();

vi.mock('../../supabase', () => ({
  getServiceClient: getServiceClientMock,
}));

function createThenableQuery(result: { data: unknown; count?: number; error: unknown }) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    lt: vi.fn(() => query),
    gte: vi.fn(() => query),
    order: vi.fn(() => query),
    then: (
      onFulfilled: (value: typeof result) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => Promise.resolve(result).then(onFulfilled, onRejected),
  };

  return query;
}

function createPaymentsQuery() {
  let status: string | null = null;
  const paidResult = {
    data: [{ amount_cents: 120000 }, { amount_cents: 130000 }],
    error: null,
  };
  const pendingResult = {
    data: [{ amount_cents: 50000 }, { amount_cents: 75000 }],
    count: 2,
    error: null,
  };

  const query = {
    select: vi.fn(() => query),
    eq: vi.fn((column: string, value: unknown) => {
      if (column === 'status') {
        status = String(value);
      }
      return query;
    }),
    gte: vi.fn(() => query),
    then: (
      onFulfilled: (value: { data: unknown; count?: number; error: unknown }) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) =>
      Promise.resolve(status === 'pending' ? pendingResult : paidResult).then(
        onFulfilled,
        onRejected
      ),
  };

  return query;
}

describe('peskids executive read model', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T12:00:00.000Z'));
    getServiceClientMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('aggregates the first six executive metrics', async () => {
    const leadsQuery = {
      select: vi.fn(() => leadsQuery),
      eq: vi.fn(() => leadsQuery),
      order: vi.fn(async () => ({
        data: [
          { lead_id: 'lead-1', source: 'gohighlevel', referral_source: 'Instagram', stage: 'New Lead', status: 'new', created_at: '2026-06-01T10:00:00.000Z' },
          { lead_id: 'lead-2', source: 'gohighlevel', referral_source: 'Referral', stage: 'Enrolled', status: 'converted', created_at: '2026-06-01T11:00:00.000Z' },
          { lead_id: 'lead-3', source: 'web', referral_source: 'Website', stage: 'Contacted', status: 'contacted', created_at: '2026-05-15T11:00:00.000Z' },
        ],
        error: null,
      })),
    };

    const studentsQuery = createThenableQuery({ data: [], count: 4, error: null });
    const feedbackQuery = createThenableQuery({ data: [], count: 1, error: null });
    const followupsQuery = createThenableQuery({ data: [], count: 1, error: null });

    getServiceClientMock.mockReturnValue({
      schema: vi.fn(() => ({
        from: vi.fn((table: string) => {
          if (table === 'peskids_leads') return leadsQuery;
          throw new Error(`Unexpected schema table ${table}`);
        }),
      })),
      from: vi.fn((table: string) => {
        if (table === 'students') return studentsQuery;
        if (table === 'payments') return createPaymentsQuery();
        if (table === 'feedback') return feedbackQuery;
        if (table === 'followups') return followupsQuery;
        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const { fetchPeskidsExecutiveSummary } = await import('../executive');
    const result = await fetchPeskidsExecutiveSummary('peskids');

    expect(result.metrics.new_leads).toBe(2);
    expect(result.metrics.converted_leads).toBe(1);
    expect(result.metrics.conversion_rate_pct).toBe(50);
    expect(result.metrics.active_students).toBe(4);
    expect(result.metrics.revenue_cents).toBe(250000);
    expect(result.metrics.pending_payments_cents).toBe(125000);
    expect(result.metrics.alerts).toBe(4);
    expect(result.pipeline_stages).toHaveLength(6);
    expect(result.lead_sources).toEqual({
      instagram: 1,
      facebook: 0,
      website: 1,
      referral: 1,
      other: 0,
    });
    expect(result.alerts.map((item) => item.key)).toEqual([
      'pending_payments',
      'overdue_followups',
      'low_feedback',
    ]);
  });
});
