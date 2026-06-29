import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
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
    extractIp: vi.fn().mockReturnValue('127.0.0.1'),
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

    const request = new NextRequest('http://localhost/api/local-services/public/tenants/acme/bookings', {
      method: 'POST',
      body: JSON.stringify({
        customer_name: 'Test',
        customer_email: 'test@example.com',
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ slug: 'acme' }) });
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error).toBe('Too many requests');
    expect(rateLimiter.checkRateLimit).toHaveBeenCalledWith('ls-public-booking:127.0.0.1');
  });

  it('logs an audit event on successful booking', async () => {
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
      } as any,
    });

    vi.mocked(tenantMeta.fetchTenantMetadataBySlug).mockResolvedValue(null);
    vi.mocked(repo.lsInsertBookingForTenantSlug).mockResolvedValue({ ok: true, id: 'b1' });

    const request = new NextRequest('http://localhost/api/local-services/public/tenants/acme/bookings', {
      method: 'POST',
      body: JSON.stringify({
        customer_name: 'Test',
        customer_email: 'test@example.com',
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ slug: 'acme' }) });
    expect(response.status).toBe(201);
    expect(audit.logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      tenant_slug: 'acme',
      action: 'CREATE',
      resource: 'ls:booking:b1',
      metadata: expect.objectContaining({
        booking_id: 'b1',
        event_type: 'local_services.booking.created',
      }),
    }));
  });
});
