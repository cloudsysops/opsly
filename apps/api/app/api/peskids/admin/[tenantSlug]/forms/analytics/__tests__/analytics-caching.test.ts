import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';
import { getCache, setCache } from '@/lib/redis-cache';
import { runTrustedPortalDalForPathSlug } from '@/lib/portal-tenant-dal';

vi.mock('@/lib/redis-cache', () => ({
  getCache: vi.fn(),
  setCache: vi.fn(() => Promise.resolve(true)),
}));

vi.mock('@/lib/portal-tenant-dal', () => ({
  PORTAL_READ_ACCESS: 'PORTAL_READ_ACCESS',
  runTrustedPortalDalForPathSlug: vi.fn(
    (_req: NextRequest, _slug: string, handler: () => Promise<Response>) => handler()
  ),
}));

vi.mock('@/lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));

describe('Peskids Form Analytics Caching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns cached analytics on cache hit without querying Supabase', async () => {
    const cachedData = {
      forms: [
        {
          formId: 'form-123',
          formTitle: 'Registration Form',
          submissionCount: 10,
          abandonnmentRate: 0.1,
          avgCompletionTimeSeconds: 45,
          errorCount: 0,
          uniqueUsers: 8,
        },
      ],
      stats: {
        totalSubmissions: 10,
        totalForms: 1,
        avgCompletionTime: 45,
        totalErrors: 0,
      },
    };

    vi.mocked(getCache).mockResolvedValueOnce(cachedData);

    const request = new NextRequest(
      'http://localhost/api/peskids/admin/test-tenant/forms/analytics'
    );
    const response = await GET(request, { params: Promise.resolve({ tenantSlug: 'test-tenant' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual(cachedData);
    expect(getCache).toHaveBeenCalledWith('peskids:form_analytics:test-tenant');
    expect(setCache).not.toHaveBeenCalled();
    expect(runTrustedPortalDalForPathSlug).toHaveBeenCalled();
  });
});
