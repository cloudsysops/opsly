import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import * as portalMe from '../../../../../../../../lib/portal-me';
import * as repo from '../../../../../../../../lib/repositories/local-services-repository';
import * as tenantMeta from '../../../../../../../../lib/tenant-metadata';
import * as rateLimiter from '../../../../../../../../lib/rate-limiter';
import * as technicianSlots from '../../../../../../../../lib/technician-available-slots';
import { technicianMetadataAsJson } from '../../../../../../../../lib/technician-tenant-profile';

vi.mock('../../../../../../../../lib/portal-me', () => ({
  fetchPortalTenantRowBySlug: vi.fn(),
}));

vi.mock('../../../../../../../../lib/repositories/local-services-repository', () => ({
  lsGetServiceByExternalKey: vi.fn(),
}));

vi.mock('../../../../../../../../lib/tenant-metadata', () => ({
  fetchTenantMetadataBySlug: vi.fn(),
}));

vi.mock('../../../../../../../../lib/rate-limiter', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('../../../../../../../../lib/technician-available-slots', () => ({
  computeTechnicianSlots: vi.fn(),
}));

describe('GET /api/local-services/public/tenants/[slug]/available-slots', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 429 when rate limit is exceeded', async () => {
    vi.mocked(portalMe.fetchPortalTenantRowBySlug).mockResolvedValue({
      ok: true,
      row: {
        id: 't1',
        slug: 'acme',
        name: 'Acme',
        owner_email: 'o@acme.com',
        plan: 'startup',
        status: 'active',
        services: {},
        created_at: '2026-01-01',
      },
    });
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetInSeconds: 60,
    });

    const req = new Request('http://localhost/api/local-services/public/tenants/acme/available-slots?date=2026-06-15&service_external_id=pc-cleanup', {
      headers: { 'x-forwarded-for': '192.168.1.100' },
    });

    const res = await GET(req as never, { params: Promise.resolve({ slug: 'acme' }) });
    expect(res.status).toBe(429);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('Too many requests');
    expect(rateLimiter.checkRateLimit).toHaveBeenCalledWith('local-services-slots:192.168.1.100');
  });

  it('returns slots when parameters are valid and rate limit is allowed', async () => {
    vi.mocked(portalMe.fetchPortalTenantRowBySlug).mockResolvedValue({
      ok: true,
      row: {
        id: 't1',
        slug: 'acme',
        name: 'Acme',
        owner_email: 'o@acme.com',
        plan: 'startup',
        status: 'active',
        services: {},
        created_at: '2026-01-01',
      },
    });
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 50,
      resetInSeconds: 60,
    });
    vi.mocked(tenantMeta.fetchTenantMetadataBySlug).mockResolvedValue(technicianMetadataAsJson());
    vi.mocked(repo.lsGetServiceByExternalKey).mockResolvedValue({
      id: 's1',
      tenant_slug: 'acme',
      external_key: 'pc-cleanup',
      name: 'PC Cleanup',
      description: null,
      duration_minutes: 60,
      price_cents: 5000,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    });
    vi.mocked(technicianSlots.computeTechnicianSlots).mockResolvedValue([
      { start: '2026-06-15T09:00:00.000Z', end: '2026-06-15T10:00:00.000Z' },
    ]);

    const req = new Request('http://localhost/api/local-services/public/tenants/acme/available-slots?date=2026-06-15&service_external_id=pc-cleanup', {
      headers: { 'x-forwarded-for': '192.168.1.100' },
    });

    const res = await GET(req as never, { params: Promise.resolve({ slug: 'acme' }) });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { date: string; service_external_id: string; slots: unknown[] };
    expect(body.date).toBe('2026-06-15');
    expect(body.service_external_id).toBe('pc-cleanup');
    expect(body.slots).toHaveLength(1);
  });
});
