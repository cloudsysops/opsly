import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getServiceClientMock = vi.fn();
const getCacheMock = vi.fn();
const setCacheMock = vi.fn();

vi.mock('../../supabase', () => ({
  getServiceClient: getServiceClientMock,
}));

vi.mock('../../redis-cache', () => ({
  getCache: getCacheMock,
  setCache: setCacheMock,
}));

function createThenableQuery(result: { data: unknown; count?: number; error: unknown }) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    lt: vi.fn(() => query),
    gte: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    then: (
      onFulfilled: (value: typeof result) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => Promise.resolve(result).then(onFulfilled, onRejected),
  };

  return query;
}

describe('peskids repository dashboard summary', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T12:00:00.000Z'));
    getServiceClientMock.mockReset();
    getCacheMock.mockReset();
    setCacheMock.mockReset();

    // Default to cache miss
    getCacheMock.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fetches and aggregates dashboard summary from Supabase on cache miss', async () => {
    const leadsWeekQuery = createThenableQuery({ data: [], count: 5, error: null });
    const recentLeadsQuery = createThenableQuery({
      data: [{ id: 'lead-1', full_name: 'Test Lead', created_at: '2026-06-01T10:00:00.000Z' }],
      error: null,
    });
    const recentFeedbackQuery = createThenableQuery({
      data: [
        {
          id: 'fb-1',
          child_name: 'Test Child',
          satisfaction: 5,
          created_at: '2026-06-01T11:00:00.000Z',
        },
      ],
      error: null,
    });
    const actionCountQuery = createThenableQuery({ data: [], count: 2, error: null });
    const lowAlertsQuery = createThenableQuery({
      data: [
        {
          id: 'fb-low',
          child_name: 'Low Child',
          satisfaction: 1,
          created_at: '2026-06-01T09:00:00.000Z',
        },
      ],
      error: null,
    });

    getServiceClientMock.mockReturnValue({
      schema: vi.fn(() => ({
        from: vi.fn((table: string) => {
          if (table === 'peskids_leads') {
            // It's called twice: once for count, once for data
            // We need to distinguish them or return same mock if possible
            // The first one is count leadsWeek
            return {
              select: vi.fn((_columns, options) => {
                if (options?.count === 'exact') return leadsWeekQuery;
                return recentLeadsQuery;
              }),
            };
          }
          if (table === 'peskids_feedback') {
            return {
              select: vi.fn((_columns, options) => {
                if (options?.count === 'exact') return actionCountQuery;
                // Distinguish between recent feedback and low alerts
                // recent feedback has no .lt() call before it but repository calls them all in Promise.all
                // The implementation uses chainable methods.

                const query = {
                  eq: vi.fn(() => query),
                  lt: vi.fn(() => {
                    return lowAlertsQuery;
                  }),
                  order: vi.fn(() => query),
                  limit: vi.fn(() => query),
                  then: (onFulfilled: any) =>
                    Promise.resolve({ data: [{ id: 'fb-1' }], error: null }).then(onFulfilled),
                };

                // Better to return a more sophisticated mock if needed, but let's try to match by calls
                return query;
              }),
            };
          }
          throw new Error(`Unexpected table ${table}`);
        }),
      })),
    });

    // Simplified mocking for the baseline - let's just make sure it calls the function
    // and returns something. Re-reading repository.ts to see the exact calls.

    const { peskidsFetchDashboardSummary } = await import('../repository');

    // We need to mock the client properly because of the Promise.all
    const mockClient = {
      schema: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      // We'll use a counter to return different results for different queries in the Promise.all
    } as any;

    let callCount = 0;
    mockClient.then = (onFulfilled: any) => {
      callCount++;
      let result;
      if (callCount === 1)
        result = { count: 5, error: null }; // leadsWeek
      else if (callCount === 2)
        result = { data: [{ id: 'lead-1' }], error: null }; // recentLeads
      else if (callCount === 3)
        result = { data: [{ id: 'fb-1' }], error: null }; // recentFeedback
      else if (callCount === 4)
        result = { count: 2, error: null }; // actionCount
      else result = { data: [{ id: 'fb-low' }], error: null }; // lowAlerts
      return Promise.resolve(result).then(onFulfilled);
    };

    getServiceClientMock.mockReturnValue(mockClient);

    const result = await peskidsFetchDashboardSummary();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.summary.new_leads_this_week).toBe(5);
      expect(result.summary.recent_leads).toHaveLength(1);
      expect(result.summary.recent_feedback).toHaveLength(1);
      expect(result.summary.feedback_action_required).toBe(2);
      expect(result.summary.low_rating_alerts).toHaveLength(1);
    }

    expect(getCacheMock).toHaveBeenCalledWith('peskids:dashboard_summary:peskids');
    expect(setCacheMock).toHaveBeenCalledWith(
      'peskids:dashboard_summary:peskids',
      result.ok ? result.summary : expect.anything(),
      60
    );
  });

  it('returns cached dashboard summary on cache hit', async () => {
    const cachedSummary = {
      tenant_slug: 'peskids',
      new_leads_this_week: 10,
      recent_leads: [],
      recent_feedback: [],
      feedback_action_required: 5,
      low_rating_alerts: [],
    };
    getCacheMock.mockResolvedValue(cachedSummary);

    const { peskidsFetchDashboardSummary } = await import('../repository');
    const result = await peskidsFetchDashboardSummary();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.summary).toEqual(cachedSummary);
    }

    expect(getServiceClientMock).not.toHaveBeenCalled();
  });
});
