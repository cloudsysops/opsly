import { describe, expect, it, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';
import * as rateLimiter from '../../../../../../../../lib/rate-limiter';
import * as audit from '../../../../../../../../lib/audit';
import * as portalMe from '../../../../../../../../lib/portal-me';
import * as repo from '../../../../../../../../lib/repositories/local-services-repository';
import * as tenantMeta from '../../../../../../../../lib/tenant-metadata';

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
  lsInsertBookingForTenantSlug: vi.fn(),
  lsResolveServiceIdByExternalKey: vi.fn(),
}));

vi.mock('../../../../../../../../lib/tenant-metadata', () => ({
  fetchTenantMetadataBySlug: vi.fn(),
}));

describe('POST /api/local-services/public/tenants/[slug]/bookings security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 429 when rate limit is exceeded', async () => {
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date(),
    });

    const req = new NextRequest('http://x/api/local-services/public/tenants/acme/bookings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        customer_name: 'A',
        customer_email: 'a@b.com',
      }),
    });

    const res = await POST(req, { params: Promise.resolve({ slug: 'acme' }) });
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe('Too many requests');
  });

  it('logs security audit event with masked email on successful booking creation', async () => {
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
    vi.mocked(tenantMeta.fetchTenantMetadataBySlug).mockResolvedValue(null);
    vi.mocked(repo.lsInsertBookingForTenantSlug).mockResolvedValue({ ok: true, id: 'b1' });

    const req = new NextRequest('http://x', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        customer_name: 'Cliente',
        customer_email: 'secure-email@test.com',
      }),
    });

    const res = await POST(req, { params: Promise.resolve({ slug: 'acme' }) });
    expect(res.status).toBe(201);

    expect(audit.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_slug: 'acme',
        action: 'local_services_booking_create',
        resource: 'local-services:booking:b1',
        metadata: expect.objectContaining({
          booking_id: 'b1',
          customer_email_masked: 'se***@test.com',
          event_type: 'local_services_booking.created',
        }),
      })
    );
  });
});
