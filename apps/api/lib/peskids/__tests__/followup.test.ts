import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getServiceClientMock = vi.fn();
const fetchMock = vi.fn();

vi.mock('../../supabase', () => ({
  getServiceClient: getServiceClientMock,
}));

// Mock global fetch for GHL calls
vi.stubGlobal('fetch', fetchMock);

function createThenableQuery(result: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    lt: vi.fn(() => query),
    gte: vi.fn(() => query),
    order: vi.fn(() => query),
    single: vi.fn(async () => result),
    then: (onFulfilled: (value: typeof result) => unknown) =>
      Promise.resolve(result).then(onFulfilled),
  };
  return query;
}

describe('peskids followup service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-03T12:00:00.000Z'));
    getServiceClientMock.mockReset();
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getPendingFollowups', () => {
    it('returns leads older than 24h in New Lead stage with followup_sent=false', async () => {
      const leadsQuery = {
        select: vi.fn(() => leadsQuery),
        eq: vi.fn(() => leadsQuery),
        lt: vi.fn(() => leadsQuery),
        order: vi.fn(async () => ({
          data: [
            {
              id: 'lead-1',
              lead_id: 'ghl-contact-1',
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
        })),
      };

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
      expect(result.pending_followups[0].lead_id).toBe('ghl-contact-1');
      expect(result.pending_followups[1].lead_id).toBeNull();
    });

    it('returns empty when no pending leads', async () => {
      const leadsQuery = {
        select: vi.fn(() => leadsQuery),
        eq: vi.fn(() => leadsQuery),
        lt: vi.fn(() => leadsQuery),
        order: vi.fn(async () => ({ data: [], error: null })),
      };

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
      const leadsQuery = {
        select: vi.fn(() => leadsQuery),
        eq: vi.fn(() => leadsQuery),
        lt: vi.fn(() => leadsQuery),
        order: vi.fn(async () => ({ data: null, error: { message: 'DB error' } })),
      };

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
    it('creates GHL tasks for pending leads and marks followup_sent', async () => {
      const leadsQuery = {
        select: vi.fn(() => leadsQuery),
        eq: vi.fn(() => leadsQuery),
        lt: vi.fn(() => leadsQuery),
        order: vi.fn(async () => ({
          data: [
            {
              id: 'lead-1',
              lead_id: 'ghl-contact-1',
              parent_name: 'Maria Lopez',
              child_name: 'Sofia',
              email: 'maria@example.com',
              phone: '+573001234567',
              stage: 'New Lead',
              created_at: '2026-06-01T10:00:00.000Z',
            },
          ],
          error: null,
        })),
      };

      // Mock fetch for the update (read + write pattern)
      const readQuery = createThenableQuery({
        data: { followup_log: [] },
        error: null,
      });
      const updateQuery = createThenableQuery({
        data: null,
        error: null,
      });

      const schemaMock = vi.fn((schema: string) => {
        if (schema === 'platform') {
          return {
            from: vi.fn((table: string) => {
              if (table === 'peskids_leads') {
                if (!('callCount' in schemaMock)) {
                  (schemaMock as unknown as Record<string, number>).callCount = 0;
                }
                const count = ((schemaMock as unknown as Record<string, number>).callCount ?? 0);
                (schemaMock as unknown as Record<string, number>).callCount = count + 1;
                if (count === 0) return leadsQuery;
                if (count === 1) {
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
              }
              throw new Error(`Unexpected table ${table}`);
            }),
          };
        }
        throw new Error(`Unexpected schema ${schema}`);
      });
      (schemaMock as unknown as Record<string, number>).callCount = 0;

      getServiceClientMock.mockReturnValue({
        schema: schemaMock,
      });

      // Mock GHL task creation success
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 'ghl-task-1' } }),
      });

      const { executePendingFollowups } = await import('../followup');

      // Set env for GHL
      vi.stubEnv('GOHIGHLEVEL_PESKIDS_API_KEY', 'test-key');

      const result = await executePendingFollowups('peskids');

      expect(result.processed).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.errors).toEqual([]);

      // Verify GHL API was called correctly
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const fetchCall = fetchMock.mock.calls[0];
      expect(fetchCall[0]).toContain('/v1/tasks/');
      expect(fetchCall[1]?.method).toBe('POST');
      const body = JSON.parse(fetchCall[1]?.body ?? '{}');
      expect(body.title).toContain('Maria Lopez');
      expect(body.title).toContain('Sofia');
      expect(body.contactId).toBe('ghl-contact-1');

      vi.unstubAllEnvs();
    });

    it('skips leads without lead_id and marks as skipped', async () => {
      const leadsQuery = {
        select: vi.fn(() => leadsQuery),
        eq: vi.fn(() => leadsQuery),
        lt: vi.fn(() => leadsQuery),
        order: vi.fn(async () => ({
          data: [
            {
              id: 'lead-no-ghl',
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
        })),
      };

      const readQuery = createThenableQuery({
        data: { followup_log: [] },
        error: null,
      });
      const updateQuery = createThenableQuery({
        data: null,
        error: null,
      });

      const schemaMock = vi.fn(() => ({
        from: vi.fn((table: string) => {
          if (table === 'peskids_leads') {
            if (!('callCount' in schemaMock)) {
              (schemaMock as unknown as Record<string, number>).callCount = 0;
            }
            const count = (schemaMock as unknown as Record<string, number>).callCount ?? 0;
            (schemaMock as unknown as Record<string, number>).callCount = count + 1;
            if (count === 0) return leadsQuery;
            if (count === 1) {
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
          }
          throw new Error(`Unexpected table ${table}`);
        }),
      }));
      (schemaMock as unknown as Record<string, number>).callCount = 0;

      getServiceClientMock.mockReturnValue({
        schema: schemaMock,
      });

      const { executePendingFollowups } = await import('../followup');
      const result = await executePendingFollowups('peskids');

      expect(result.processed).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.failed).toBe(0);
      // GHL should not be called for a skipped lead
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('reports GHL API failures without marking followup_sent', async () => {
      const leadsQuery = {
        select: vi.fn(() => leadsQuery),
        eq: vi.fn(() => leadsQuery),
        lt: vi.fn(() => leadsQuery),
        order: vi.fn(async () => ({
          data: [
            {
              id: 'lead-fail',
              lead_id: 'ghl-contact-fail',
              parent_name: 'Fail',
              child_name: 'Test',
              email: 'fail@example.com',
              phone: '+573001234567',
              stage: 'New Lead',
              created_at: '2026-06-01T10:00:00.000Z',
            },
          ],
          error: null,
        })),
      };

      getServiceClientMock.mockReturnValue({
        schema: vi.fn(() => ({
          from: vi.fn(() => leadsQuery),
        })),
      });

      // Mock GHL failure
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      vi.stubEnv('GOHIGHLEVEL_PESKIDS_API_KEY', 'test-key');

      const { executePendingFollowups } = await import('../followup');
      const result = await executePendingFollowups('peskids');

      expect(result.processed).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('GHL API returned 500');

      vi.unstubAllEnvs();
    });
  });
});
