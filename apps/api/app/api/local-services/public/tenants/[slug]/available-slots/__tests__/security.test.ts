import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';
import * as rateLimiter from '../../../../../../../../lib/rate-limiter';
import * as audit from '../../../../../../../../lib/audit';
import * as portalMe from '../../../../../../../../lib/portal-me';
import * as repo from '../../../../../../../../lib/repositories/local-services-repository';
import * as tenantMeta from '../../../../../../../../lib/tenant-metadata';
import * as slotsHelper from '../../../../../../../../lib/technician-available-slots';
import { technicianMetadataAsJson } from '../../../../../../../../lib/technician-tenant-profile';

vi.mock('../../../../../../../../lib/rate-limiter', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('../../../../../../../../lib/audit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../../../../../lib/audit')>();
  return {
    ...actual,
    logAuditEvent: vi.fn(),
    extractIp: vi.fn(),
  };
});

vi.mock('../../../../../../../../lib/portal-me', () => ({
  fetchPortalTenantRowBySlug: vi.fn(),
}));

vi.mock('../../../../../../../../lib/repositories/local-services-repository', () => ({
  lsGetServiceByExternalKey: vi.fn(),
}));

vi.mock('../../../../../../../../lib/tenant-metadata', () => ({
  fetchTenantMetadataBySlug: vi.fn(),
}));

vi.mock('../../../../../../../../lib/technician-available-slots', () => ({
  computeTechnicianSlots: vi.fn(),
}));

describe('GET /api/local-services/public/tenants/[slug]/available-slots security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 429 when rate limit is exceeded', async () => {
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date(),
    });

    const req = new NextRequest(
      'http://x/api/local-services/public/tenants/acme/available-slots?date=2026-06-15&service_external_id=pc-cleanup'
    );

    const res = await GET(req, { params: Promise.resolve({ slug: 'acme' }) });
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe('Too many requests');
  });

  it('logs security audit event on successful slots retrieval', async () => {
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetAt: new Date(),
    });
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
    vi.mocked(tenantMeta.fetchTenantMetadataBySlug).mockResolvedValue(technicianMetadataAsJson());
    vi.mocked(repo.lsGetServiceByExternalKey).mockResolvedValue({
      id: 'svc-1',
      duration_minutes: 60,
    } as any);
    vi.mocked(slotsHelper.computeTechnicianSlots).mockResolvedValue(['09:00', '10:00']);

    const req = new NextRequest(
      'http://x/api/local-services/public/tenants/acme/available-slots?date=2026-06-15&service_external_id=pc-cleanup'
    );

    const res = await GET(req, { params: Promise.resolve({ slug: 'acme' }) });
    expect(res.status).toBe(200);

    expect(audit.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_slug: 'acme',
        action: 'local_services_slots_retrieved',
        resource: 'local-services:slots:acme',
        metadata: expect.objectContaining({
          date: '2026-06-15',
          service_external_id: 'pc-cleanup',
        }),
      })
    );
  });
});
