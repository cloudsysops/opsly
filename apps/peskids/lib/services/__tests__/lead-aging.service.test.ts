import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  insertMock,
  updateEqMock,
  updateMock,
  createFollowupMock,
} = vi.hoisted(() => {
  const updateEqMock = vi.fn();
  return {
    insertMock: vi.fn(),
    updateEqMock,
    updateMock: vi.fn(() => ({ eq: updateEqMock })),
    createFollowupMock: vi.fn(),
  };
});

type QueryResult = { data: unknown; error: null | { message: string } };

function makeQuery(result: QueryResult) {
  const builder: Record<string, unknown> = {};
  const self = () => builder;
  builder.select = vi.fn(self);
  builder.eq = vi.fn(self);
  builder.lte = vi.fn(self);
  builder.lt = vi.fn(self);
  builder.in = vi.fn(self);
  builder.order = vi.fn(self);
  builder.limit = vi.fn().mockResolvedValue(result);
  return builder;
}

let platformLeadsQuery: ReturnType<typeof makeQuery>;
let followupsQuery: ReturnType<typeof makeQuery>;
let trialsQuery: ReturnType<typeof makeQuery>;

vi.mock('@/lib/supabase', () => ({
  supabaseServer: () => ({
    schema: () => ({
      from: (table: string) => {
        if (table === 'peskids_aging_alert_deliveries') {
          return { insert: insertMock, update: updateMock };
        }
        return platformLeadsQuery;
      },
    }),
    from: (table: string) => {
      if (table === 'followups') return followupsQuery;
      if (table === 'trial_classes') return trialsQuery;
      return makeQuery({ data: [], error: null });
    },
  }),
}));

vi.mock('@/lib/services/followup-admin.service', () => ({
  createFollowup: createFollowupMock,
}));

import { runLeadAgingScan } from '@/lib/services/lead-aging.service';

describe('runLeadAgingScan', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    insertMock.mockReset().mockResolvedValue({ error: null });
    updateEqMock.mockReset().mockResolvedValue({ error: null });
    createFollowupMock.mockReset().mockResolvedValue({ id: 'fu-1' });
    platformLeadsQuery = makeQuery({ data: [], error: null });
    followupsQuery = makeQuery({ data: [], error: null });
    trialsQuery = makeQuery({ data: [], error: null });
    delete process.env.PESKIDS_LEAD_REMINDER_24H_ENABLED;
    delete process.env.PESKIDS_LEAD_ESCALATION_48H_ENABLED;
    delete process.env.PESKIDS_AUTO_CREATE_FOLLOWUP_ENABLED;
    delete process.env.PESKIDS_TRIAL_REMINDER_ENABLED;
    delete process.env.PESKIDS_OPERATIONAL_NOTIFICATIONS_ENABLED;
    delete process.env.N8N_WEBHOOK_BASE_URL;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('no-ops when aging flags are off', async () => {
    const result = await runLeadAgingScan(new Date('2026-07-23T12:00:00.000Z'));
    expect(result.scanned_leads).toBe(0);
    expect(result.reminder_24h).toBe(0);
    expect(result.attendance_risk).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('claims once and notifies for a 24h lead when flags on', async () => {
    process.env.PESKIDS_LEAD_REMINDER_24H_ENABLED = 'true';
    process.env.PESKIDS_OPERATIONAL_NOTIFICATIONS_ENABLED = 'true';
    process.env.N8N_WEBHOOK_BASE_URL = 'https://n8n.example.com/webhook';
    platformLeadsQuery = makeQuery({
      data: [
        {
          id: '11111111-1111-1111-1111-111111111111',
          full_name: 'Ana',
          email: 'a@x.com',
          phone: null,
          status: 'new',
          created_at: '2026-07-22T10:00:00.000Z',
        },
      ],
      error: null,
    });

    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));

    const result = await runLeadAgingScan(new Date('2026-07-23T12:00:00.000Z'));
    expect(result.reminder_24h).toBe(1);
    expect(insertMock).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('skips duplicate via unique conflict', async () => {
    process.env.PESKIDS_LEAD_REMINDER_24H_ENABLED = 'true';
    insertMock.mockResolvedValue({ error: { code: '23505', message: 'duplicate' } });
    platformLeadsQuery = makeQuery({
      data: [
        {
          id: '11111111-1111-1111-1111-111111111111',
          full_name: 'Ana',
          email: null,
          phone: null,
          status: 'new',
          created_at: '2026-07-22T10:00:00.000Z',
        },
      ],
      error: null,
    });

    const result = await runLeadAgingScan(new Date('2026-07-23T12:00:00.000Z'));
    expect(result.skipped).toBeGreaterThanOrEqual(1);
    expect(result.reminder_24h).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
  });
});
