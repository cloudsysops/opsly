import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetCache, mockSetCache, mockSelect, mockFrom, mockSchema } = vi.hoisted(() => {
  const mockGetCache = vi.fn();
  const mockSetCache = vi.fn(() => Promise.resolve(true));
  const mockSelect = vi.fn();
  const mockFrom = vi.fn(() => ({ select: mockSelect }));
  const mockSchema = vi.fn(() => ({ from: mockFrom }));

  return {
    mockGetCache,
    mockSetCache,
    mockSelect,
    mockFrom,
    mockSchema,
  };
});

vi.mock('../../redis-cache', () => ({
  getCache: mockGetCache,
  setCache: mockSetCache,
}));

vi.mock('../../supabase/client', () => ({
  getServiceClient: () => ({
    schema: mockSchema,
  }),
}));

import { getInsightsForTenant } from '../engine';

describe('getInsightsForTenant caching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns cached tenant insights when available in Redis', async () => {
    const cachedRows = [
      {
        id: 'ins-1',
        tenant_id: 't-123',
        insight_type: 'churn_risk',
        title: 'Cached Insight',
        summary: 'Summary',
        payload: {},
        confidence: 0.9,
        impact_score: 80,
        status: 'active',
        created_at: '2026-06-27T00:00:00Z',
        read_at: null,
        actioned_at: null,
      },
    ];
    mockGetCache.mockResolvedValueOnce(cachedRows);

    const result = await getInsightsForTenant('t-123', { includeRead: false, limit: 10 });

    expect(result).toEqual(cachedRows);
    expect(mockGetCache).toHaveBeenCalledWith('tenant:insights:t-123:0:10');
    expect(mockSchema).not.toHaveBeenCalled();
  });

  it('queries Supabase on cache miss and sets result in Redis', async () => {
    mockGetCache.mockResolvedValueOnce(null);

    const dbRows = [
      {
        id: 'ins-2',
        tenant_id: 't-123',
        insight_type: 'revenue_forecast',
        title: 'Fresh Insight',
        summary: 'Fresh Summary',
        payload: {},
        confidence: 0.8,
        impact_score: 50,
        status: 'active',
        created_at: '2026-06-27T00:00:00Z',
        read_at: null,
        actioned_at: null,
      },
    ];

    const mockIs = vi.fn().mockResolvedValue({ data: dbRows, error: null });
    const mockLimit = vi.fn().mockReturnValue({ is: mockIs });
    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockEq2 = vi.fn().mockReturnValue({ order: mockOrder });
    const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
    mockSelect.mockReturnValue({ eq: mockEq1 } as unknown as ReturnType<typeof mockSelect>);

    const result = await getInsightsForTenant('t-123', { includeRead: false, limit: 24 });

    expect(result).toEqual(dbRows);
    expect(mockGetCache).toHaveBeenCalledWith('tenant:insights:t-123:0:24');
    expect(mockSetCache).toHaveBeenCalledWith('tenant:insights:t-123:0:24', dbRows, 60);
  });
});
