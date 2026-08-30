import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../../lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));

vi.mock('../../../../../lib/portal-auth', () => ({
  getUserFromAuthorizationHeader: vi.fn(),
}));

vi.mock('../../../../../lib/bullmq-pipeline-counts', () => ({
  getBullmqPipelineJobTotals: vi.fn(),
}));

vi.mock('../../../../../lib/redis-cache', () => ({
  getCache: vi.fn(),
  setCache: vi.fn(() => Promise.resolve(true)),
}));

import { getBullmqPipelineJobTotals } from '../../../../../lib/bullmq-pipeline-counts';
import { getUserFromAuthorizationHeader } from '../../../../../lib/portal-auth';
import { getCache, setCache } from '../../../../../lib/redis-cache';
import { getServiceClient } from '../../../../../lib/supabase';
import { GET } from '../route';

const superAdminUser = {
  id: 'admin-1',
  user_metadata: { role: 'admin' },
  app_metadata: {},
};

describe('GET /api/admin/metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCache).mockResolvedValue(null);
    vi.mocked(setCache).mockResolvedValue(true);
    vi.mocked(getUserFromAuthorizationHeader).mockResolvedValue(superAdminUser as never);
    vi.mocked(getBullmqPipelineJobTotals).mockResolvedValue({
      openclaw_total: 2,
      teams_total: 1,
      all_queues_total: 3,
    });
    vi.mocked(getServiceClient).mockReturnValue({
      rpc: vi.fn((name: string) => {
        if (name === 'opsly_admin_metrics') {
          return Promise.resolve({
            data: {
              active_tenants: 5,
              gross_revenue_month: 42.5,
            },
            error: null,
          });
        }
        if (name === 'opsly_admin_revenue_by_month') {
          return Promise.resolve({
            data: [{ month: '2026-01', amount: 10 }],
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: new Error('unknown') });
      }),
    } as never);
  });

  it('returns 401 without super admin user', async () => {
    vi.mocked(getUserFromAuthorizationHeader).mockResolvedValue(null);
    const res = await GET(
      new Request('http://localhost/api/admin/metrics', {
        headers: { Authorization: 'Bearer x' },
      })
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-super-admin', async () => {
    vi.mocked(getUserFromAuthorizationHeader).mockResolvedValue({
      id: 'u',
      user_metadata: {},
      app_metadata: {},
    } as never);
    const res = await GET(
      new Request('http://localhost/api/admin/metrics', {
        headers: { Authorization: 'Bearer x' },
      })
    );
    expect(res.status).toBe(403);
  });

  it('returns metrics JSON for super admin and caches payload on cache miss', async () => {
    const res = await GET(
      new Request('http://localhost/api/admin/metrics', {
        headers: { Authorization: 'Bearer token' },
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      active_tenants: number;
      gross_revenue_month_usd: number;
      bullmq_pipeline_jobs: number;
    };
    expect(body.active_tenants).toBe(5);
    expect(body.gross_revenue_month_usd).toBe(42.5);
    expect(body.bullmq_pipeline_jobs).toBe(3);
    expect(getCache).toHaveBeenCalledWith('admin:metrics:summary');
    expect(setCache).toHaveBeenCalledWith(
      'admin:metrics:summary',
      expect.objectContaining({
        active_tenants: 5,
        gross_revenue_month_usd: 42.5,
        bullmq_pipeline_jobs: 3,
      }),
      60
    );
  });

  it('returns cached metrics JSON immediately on cache hit', async () => {
    const mockCachedData = {
      active_tenants: 10,
      gross_revenue_month_usd: 120.0,
      revenue_last_months: [],
      bullmq_pipeline_jobs: 5,
      bullmq: { redis_available: true },
    };
    vi.mocked(getCache).mockResolvedValue(mockCachedData);

    const res = await GET(
      new Request('http://localhost/api/admin/metrics', {
        headers: { Authorization: 'Bearer token' },
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(mockCachedData);
    expect(getServiceClient).not.toHaveBeenCalled();
    expect(getBullmqPipelineJobTotals).not.toHaveBeenCalled();
    expect(setCache).not.toHaveBeenCalled();
  });
});
