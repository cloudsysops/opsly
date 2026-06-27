import { beforeEach, describe, expect, it, vi } from 'vitest';
import { peskidsFetchDashboardSummary } from '../repository';
import * as redisCache from '../../redis-cache';
import * as supabase from '../../supabase';

vi.mock('../../redis-cache', () => ({
  getCache: vi.fn(),
  setCache: vi.fn(),
}));

vi.mock('../../supabase', () => ({
  getServiceClient: vi.fn(),
}));

describe('peskidsFetchDashboardSummary caching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns cached data if available', async () => {
    const mockSummary = {
      tenant_slug: 'peskids',
      new_leads_this_week: 5,
      recent_leads: [],
      recent_feedback: [],
      feedback_action_required: 2,
      low_rating_alerts: [],
    };
    vi.mocked(redisCache.getCache).mockResolvedValueOnce(mockSummary);

    const result = await peskidsFetchDashboardSummary();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.summary).toEqual(mockSummary);
    }
    expect(redisCache.getCache).toHaveBeenCalledWith('peskids:dashboard_summary');
    expect(supabase.getServiceClient).not.toHaveBeenCalled();
  });

  it('fetches from supabase and populates cache if cache is empty', async () => {
    vi.mocked(redisCache.getCache).mockResolvedValueOnce(null);

    const mockClient = {
      schema: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((callback) =>
        Promise.resolve({
          data: [],
          count: 10,
          error: null,
        }).then(callback)
      ),
    };
    vi.mocked(supabase.getServiceClient).mockReturnValue(mockClient as unknown as any);

    const result = await peskidsFetchDashboardSummary();

    expect(result.ok).toBe(true);
    expect(redisCache.getCache).toHaveBeenCalledWith('peskids:dashboard_summary');
    expect(supabase.getServiceClient).toHaveBeenCalled();
    expect(redisCache.setCache).toHaveBeenCalledWith(
      'peskids:dashboard_summary',
      expect.objectContaining({
        tenant_slug: 'peskids',
        new_leads_this_week: 10,
      }),
      60
    );
  });
});
