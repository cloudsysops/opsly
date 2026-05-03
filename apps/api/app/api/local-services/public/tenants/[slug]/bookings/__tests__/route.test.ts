import { describe, expect, it, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import * as portalMe from '../../../../../../../../lib/portal-me';
import * as repo from '../../../../../../../../lib/repositories/local-services-repository';
import * as tenantMeta from '../../../../../../../../lib/tenant-metadata';
import { technicianMetadataAsJson } from '../../../../../../../../lib/technician-tenant-profile';

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

describe('POST /api/local-services/public/tenants/[slug]/bookings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 when tenant not found', async () => {
    vi.mocked(portalMe.fetchPortalTenantRowBySlug).mockResolvedValue({
      ok: false,
      reason: 'not_found',
    });
    const req = new Request('http://x/api/local-services/public/tenants/acme/bookings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        customer_name: 'A',
        customer_email: 'a@b.com',
      }),
    });
    const res = await POST(req as never, { params: Promise.resolve({ slug: 'acme' }) });
    expect(res.status).toBe(404);
  });

  it('returns 201 when tenant active and insert ok', async () => {
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

    const req = new Request('http://x', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        customer_name: 'Cliente',
        customer_email: 'c@test.com',
      }),
    });
    const res = await POST(req as never, { params: Promise.resolve({ slug: 'acme' }) });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { booking_id: string; tenant_slug: string };
    expect(body.booking_id).toBe('b1');
    expect(body.tenant_slug).toBe('acme');
    expect(vi.mocked(repo.lsInsertBookingForTenantSlug)).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantSlug: 'acme',
        customerEmail: 'c@test.com',
      })
    );
  });

  it('returns 400 when technician tenant missing required fields', async () => {
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

    const req = new Request('http://x', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        customer_name: 'Cliente',
        customer_email: 'c@test.com',
        service_external_id: 'pc-cleanup',
      }),
    });
    const res = await POST(req as never, { params: Promise.resolve({ slug: 'acme' }) });
    expect(res.status).toBe(400);
  });

  it('returns 201 for technician booking when address and schedule present', async () => {
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
    vi.mocked(repo.lsResolveServiceIdByExternalKey).mockResolvedValue('svc-uuid-1');
    vi.mocked(repo.lsInsertBookingForTenantSlug).mockResolvedValue({ ok: true, id: 'b2' });

    const req = new Request('http://x', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        customer_name: 'Cliente',
        customer_email: 'c@test.com',
        service_external_id: 'pc-cleanup',
        address: '1 Main St, Providence, RI 02903',
        scheduled_at: '2026-06-15T18:00:00.000Z',
        service_location: 'home',
      }),
    });
    const res = await POST(req as never, { params: Promise.resolve({ slug: 'acme' }) });
    expect(res.status).toBe(201);
    expect(vi.mocked(repo.lsResolveServiceIdByExternalKey)).toHaveBeenCalledWith({
      tenantSlug: 'acme',
      externalKey: 'pc-cleanup',
    });
    expect(vi.mocked(repo.lsInsertBookingForTenantSlug)).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceId: 'svc-uuid-1',
        address: '1 Main St, Providence, RI 02903',
        serviceLocation: 'home',
      })
    );
  });
});
