import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseServerMock = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabaseServer: supabaseServerMock,
}));

function createPlatformQuery(result: { data: unknown; error: unknown }) {
  const terminal = {
    limit: vi.fn(async () => result),
    then: (
      onFulfilled: (value: typeof result) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => Promise.resolve(result).then(onFulfilled, onRejected),
  };

  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    gte: vi.fn(() => query),
    order: vi.fn(() => terminal),
    limit: vi.fn(async () => result),
  };
  return query;
}

function createLegacyOrderQuery(result: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    gte: vi.fn(() => query),
    order: vi.fn(async () => result),
  };
  return query;
}

function createLegacyFilterQuery(result: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(async () => result),
  };
  return query;
}

describe('peskids-platform-dashboard', () => {
  beforeEach(async () => {
    supabaseServerMock.mockReset();
    vi.resetModules();
  });

  it('reads leads from platform.peskids_leads first', async () => {
    const platformLeadsQuery = createPlatformQuery({
      data: [
        {
          id: 'lead-1',
          full_name: 'Ana',
          email: 'ana@example.com',
          phone: null,
          class_modality: null,
          neighborhood: null,
          grade_interested: '3A',
          status: 'new',
          admin_notes: null,
          created_at: '2026-05-26T10:00:00Z',
        },
      ],
      error: null,
    });

    supabaseServerMock.mockReturnValue({
      schema: vi.fn(() => ({
        from: vi.fn((table: string) => {
          if (table === 'peskids_leads') return platformLeadsQuery;
          throw new Error(`Unexpected platform table ${table}`);
        }),
      })),
      from: vi.fn(() => {
        throw new Error('legacy leads should not be queried');
      }),
    });

    const { fetchDashboardLeads } = await import('@/lib/peskids-platform-dashboard');
    const result = await fetchDashboardLeads('peskids', '2026-05-01T00:00:00.000Z');

    expect(result.source).toBe('platform');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.name).toBe('Ana');
  });

  it('falls back to public.leads when platform table is missing', async () => {
    const platformLeadsQuery = createPlatformQuery({
      data: null,
      error: { message: 'relation "platform.peskids_leads" does not exist' },
    });
    const legacyLeadsQuery = createLegacyOrderQuery({
      data: [
        {
          id: 'legacy-1',
          name: 'Luis',
          email: 'luis@example.com',
          phone: null,
          class_modality: null,
          neighborhood: null,
          grade_interested: '4B',
          status: 'new',
          admin_notes: null,
          referral_code: null,
          referred_by_code: null,
          referral_discount_cents: null,
          referral_redemptions: null,
          created_at: '2026-05-26T11:00:00Z',
        },
      ],
      error: null,
    });

    supabaseServerMock.mockReturnValue({
      schema: vi.fn(() => ({
        from: vi.fn(() => platformLeadsQuery),
      })),
      from: vi.fn((table: string) => {
        if (table === 'leads') return legacyLeadsQuery;
        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const { fetchDashboardLeads } = await import('@/lib/peskids-platform-dashboard');
    const result = await fetchDashboardLeads('peskids', '2026-05-01T00:00:00.000Z');

    expect(result.source).toBe('legacy');
    expect(result.rows[0]?.name).toBe('Luis');
  });

  it('falls back to legacy feedback when platform feedback is missing', async () => {
    const platformFeedbackQuery = createPlatformQuery({
      data: null,
      error: { message: 'permission denied for schema platform' },
    });
    const legacyFeedbackQuery = createLegacyFilterQuery({
      data: [
        {
          id: 'feedback-legacy',
          child_name: 'Sara',
          satisfaction: 4,
          suggestion: 'Todo bien',
          visibility: 'public',
          audience: 'family',
        },
      ],
      error: null,
    });

    supabaseServerMock.mockReturnValue({
      schema: vi.fn(() => ({
        from: vi.fn(() => platformFeedbackQuery),
      })),
      from: vi.fn((table: string) => {
        if (table === 'feedback') return legacyFeedbackQuery;
        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const { fetchDashboardFeedback } = await import('@/lib/peskids-platform-dashboard');
    const result = await fetchDashboardFeedback('peskids', 20);

    expect(result.source).toBe('legacy');
    expect(result.recentFeedback).toEqual([
      expect.objectContaining({ id: 'feedback-legacy', child_name: 'Sara' }),
    ]);
  });
});
