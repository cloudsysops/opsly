import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getServiceClientMock = vi.fn();
const fetchMock = vi.fn();
const getCacheMock = vi.fn();
const setCacheMock = vi.fn(() => Promise.resolve(true));

vi.mock('../../supabase', () => ({
  getServiceClient: getServiceClientMock,
}));

vi.mock('../../redis-cache', () => ({
  getCache: getCacheMock,
  setCache: setCacheMock,
}));

vi.stubGlobal('fetch', fetchMock);

function createLeadsListQuery(result: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    lt: vi.fn(() => query),
    order: vi.fn(async () => result),
  };
  return query;
}

function createMarkFollowupSchema(leadsQuery: ReturnType<typeof createLeadsListQuery>) {
  let callCount = 0;
  return vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table !== 'peskids_leads') {
        throw new Error(`Unexpected table ${table}`);
      }
      const count = callCount;
      callCount += 1;
      if (count === 0) return leadsQuery;
      if (count % 2 === 1) {
        const q = {
          select: vi.fn(() => q),
          eq: vi.fn(() => q),
          single: vi.fn(async () => ({
            data: { followup_log: [] },
            error: null,
          })),
        };
        return q;
      }
      const q = {
        update: vi.fn(() => q),
        eq: vi.fn(() => q),
        then: (onFulfilled: (v: { data: unknown; error: unknown }) => unknown) =>
          Promise.resolve({ data: null, error: null }).then(onFulfilled),
      };
      return q;
    }),
  }));
}

describe('peskids followup service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-03T12:00:00.000Z'));
    getServiceClientMock.mockReset();
    fetchMock.mockReset();
    getCacheMock.mockReset();
    setCacheMock.mockReset();
    setCacheMock.mockReturnValue(Promise.resolve(true));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getPendingFollowups', () => {
    it('returns cached pending followups if cache hit occurs', async () => {
      const cachedData = {
        tenant_slug: 'peskids',
        pending_followups: [
          {
            id: 'lead-cached',
            lead_id: 'cached-id',
            parent_name: 'Cached Parent',
            child_name: null,
            email: 'cached@example.com',
            phone: null,
            stage: 'New Lead',
            created_at: '2026-06-01T10:00:00.000Z',
            hours_since_creation: 50,
          },
        ],
        count: 1,
      };
      getCacheMock.mockResolvedValueOnce(cachedData);

      const { getPendingFollowups } = await import('../followup');
      const result = await getPendingFollowups('peskids');

      expect(result).toEqual(cachedData);
      expect(getCacheMock).toHaveBeenCalledWith('peskids:pending_followups:peskids');
      expect(getServiceClientMock).not.toHaveBeenCalled();
    });

    it('returns leads older than 24h in New Lead stage with followup_sent=false on cache miss', async () => {
      getCacheMock.mockResolvedValueOnce(null);
      const leadsQuery = createLeadsListQuery({
        data: [
          {
            id: 'lead-1',
            lead_id: 'twenty-person-1',
            parent_name: 'Maria Lopez',
            child_name: 'Sofia',
            email: 'maria@example.com',
            phone: '+573001234567',
            stage: 'New Lead',
            created_at: '2026-06-01T10:00:00.000Z',
          },
          {
            id: 'lead-2',
            lead_id: null,
            parent_name: 'Carlos Ruiz',
            child_name: null,
            email: 'carlos@example.com',
            phone: null,
            stage: 'New Lead',
            created_at: '2026-06-01T08:00:00.000Z',
          },
        ],
        error: null,
      });

      getServiceClientMock.mockReturnValue({
        schema: vi.fn(() => ({
          from: vi.fn(() => leadsQuery),
        })),
      });

      const { getPendingFollowups } = await import('../followup');
      const result = await getPendingFollowups('peskids');

      expect(result.tenant_slug).toBe('peskids');
      expect(result.count).toBe(2);
      expect(result.pending_followups[0].hours_since_creation).toBe(50);
      expect(result.pending_followups[0].lead_id).toBe('twenty-person-1');
      expect(result.pending_followups[1].lead_id).toBeNull();
    });

    it('returns empty when no pending leads', async () => {
      const leadsQuery = createLeadsListQuery({ data: [], error: null });

      getServiceClientMock.mockReturnValue({
        schema: vi.fn(() => ({
          from: vi.fn(() => leadsQuery),
        })),
      });

      const { getPendingFollowups } = await import('../followup');
      const result = await getPendingFollowups('peskids');

      expect(result.count).toBe(0);
      expect(result.pending_followups).toEqual([]);
    });

    it('throws on query error', async () => {
      const leadsQuery = createLeadsListQuery({
        data: null,
        error: { message: 'DB error' },
      });

      getServiceClientMock.mockReturnValue({
        schema: vi.fn(() => ({
          from: vi.fn(() => leadsQuery),
        })),
      });

      const { getPendingFollowups } = await import('../followup');
      await expect(getPendingFollowups('peskids')).rejects.toThrow();
    });
  });

  describe('executePendingFollowups', () => {
    it('marks pending leads for staff/n8n without calling external CRM APIs', async () => {
      const leadsQuery = createLeadsListQuery({
        data: [
          {
            id: 'lead-1',
            lead_id: 'twenty-person-1',
            parent_name: 'Maria Lopez',
            child_name: 'Sofia',
            email: 'maria@example.com',
            phone: '+573001234567',
            stage: 'New Lead',
            created_at: '2026-06-01T10:00:00.000Z',
          },
        ],
        error: null,
      });

      getServiceClientMock.mockReturnValue({
        schema: createMarkFollowupSchema(leadsQuery),
      });

      const { executePendingFollowups } = await import('../followup');
      const result = await executePendingFollowups('peskids');

      expect(result.processed).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.errors).toEqual([]);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('also processes leads without external CRM id (local queue only)', async () => {
      const leadsQuery = createLeadsListQuery({
        data: [
          {
            id: 'lead-local-only',
            lead_id: null,
            parent_name: 'Test',
            child_name: null,
            email: 'test@example.com',
            phone: null,
            stage: 'New Lead',
            created_at: '2026-06-01T10:00:00.000Z',
          },
        ],
        error: null,
      });

      getServiceClientMock.mockReturnValue({
        schema: createMarkFollowupSchema(leadsQuery),
      });

      const { executePendingFollowups } = await import('../followup');
      const result = await executePendingFollowups('peskids');

      expect(result.processed).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.failed).toBe(0);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('reports mark failures without counting as processed', async () => {
      const leadsQuery = createLeadsListQuery({
        data: [
          {
            id: 'lead-fail',
            lead_id: 'twenty-person-fail',
            parent_name: 'Fail',
            child_name: 'Test',
            email: 'fail@example.com',
            phone: '+573001234567',
            stage: 'New Lead',
            created_at: '2026-06-01T10:00:00.000Z',
          },
        ],
        error: null,
      });

      // List query only — appendFollowupLogFallback will fail on incomplete chain
      getServiceClientMock.mockReturnValue({
        schema: vi.fn(() => ({
          from: vi.fn(() => leadsQuery),
        })),
      });

      const { executePendingFollowups } = await import('../followup');
      const result = await executePendingFollowups('peskids');

      expect(result.processed).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].lead_id).toBe('lead-fail');
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
