import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { postPublicLocalServicesBooking } from '../local-services/public-booking-post';
import * as rateLimiter from '../rate-limiter';
import * as audit from '../audit';
import * as localServicesPublic from '../local-services-public';
import * as localServicesRepo from '../repositories/local-services-repository';
import * as tenantMetadata from '../tenant-metadata';
import type { Json } from '../supabase/types';

vi.mock('../rate-limiter', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('../audit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../audit')>();
  return {
    ...actual,
    logAuditEvent: vi.fn(),
    extractIp: vi.fn(),
  };
});

vi.mock('../local-services-public', () => ({
  assertLocalServicesTenantPublic: vi.fn(),
}));

vi.mock('../repositories/local-services-repository', () => ({
  lsInsertBookingForTenantSlug: vi.fn(),
  lsResolveServiceIdByExternalKey: vi.fn(),
}));

vi.mock('../tenant-metadata', () => ({
  fetchTenantMetadataBySlug: vi.fn(),
}));

describe('Local Services Public Booking Endpoint Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(localServicesPublic.assertLocalServicesTenantPublic).mockResolvedValue(null);
  });

  it('returns 429 when rate limit is exceeded', async () => {
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date(),
    });

    const request = new NextRequest(
      'http://localhost/api/local-services/public/tenants/acme/bookings',
      {
        method: 'POST',
        body: JSON.stringify({
          customer_name: 'John Doe',
          customer_email: 'john@example.com',
          customer_phone: '+1234567890',
          notes: 'Some notes',
        }),
      }
    );

    const response = await postPublicLocalServicesBooking(request, 'acme');
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error).toBe('Too many requests');
  });

  it('logs an audit event on successful booking creation', async () => {
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetAt: new Date(),
    });

    vi.mocked(tenantMetadata.fetchTenantMetadataBySlug).mockResolvedValue({
      local_services_profile: 'technician',
      local_services_allowed_states: ['RI', 'MA'],
    } as unknown as Json);

    vi.mocked(localServicesRepo.lsResolveServiceIdByExternalKey).mockResolvedValue(
      'service-id-123'
    );

    vi.mocked(localServicesRepo.lsInsertBookingForTenantSlug).mockResolvedValue({
      ok: true,
      id: 'booking-uuid-123',
    });

    const request = new NextRequest(
      'http://localhost/api/local-services/public/tenants/acme/bookings',
      {
        method: 'POST',
        body: JSON.stringify({
          customer_name: 'John Doe',
          customer_email: 'john@example.com',
          customer_phone: '+1234567890',
          service_external_id: 'pc-cleanup',
          address: '123 Main St, Providence, RI 02903',
          scheduled_at: '2026-12-25T10:00:00Z',
          notes: 'Some notes',
        }),
      }
    );

    const response = await postPublicLocalServicesBooking(request, 'acme');
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.booking_id).toBe('booking-uuid-123');

    expect(audit.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_slug: 'acme',
        action: 'CREATE',
        resource: 'local-services:booking:booking-uuid-123',
        metadata: {
          event_type: 'booking.created',
        },
      })
    );
  });
});
