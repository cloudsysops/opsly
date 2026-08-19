import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import * as rateLimiter from '@/lib/rate-limiter';
import * as audit from '@/lib/audit';
import * as auth from '@/lib/auth';
import * as repo from '@/lib/repositories/local-services-repository';

vi.mock('@/lib/rate-limiter', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('@/lib/audit', () => ({
  extractIp: vi.fn(() => '192.168.1.50'),
  logAuditEvent: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  requireAdminAccess: vi.fn(),
}));

vi.mock('@/lib/repositories/local-services-repository', () => ({
  lsGetBookingByIdForTenantSlug: vi.fn(),
  lsInsertTechnicianServiceReport: vi.fn(),
  lsSetBookingStatusForTenantSlug: vi.fn(),
}));

describe('Technician Booking Complete Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth.requireAdminAccess).mockResolvedValue(null);
  });

  it('returns 429 when rate limit is exceeded', async () => {
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date(),
    });

    const req = new NextRequest(
      'http://localhost/api/admin/local-services/acme/bookings/b123/complete',
      {
        method: 'POST',
        body: JSON.stringify({ findings: 'All good' }),
      }
    );

    const context = { params: Promise.resolve({ slug: 'acme', bookingId: 'b123' }) };
    const res = await POST(req, context);

    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toBe('Too many requests');
    expect(rateLimiter.checkRateLimit).toHaveBeenCalledWith('technician-complete:192.168.1.50');
  });

  it('records audit event on successful booking completion', async () => {
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetAt: new Date(),
    });

    vi.mocked(repo.lsGetBookingByIdForTenantSlug).mockResolvedValue({
      id: 'b123',
    } as unknown as ReturnType<typeof repo.lsGetBookingByIdForTenantSlug>);
    vi.mocked(repo.lsInsertTechnicianServiceReport).mockResolvedValue({ ok: true, id: 'rep-999' });
    vi.mocked(repo.lsSetBookingStatusForTenantSlug).mockResolvedValue({ ok: true });

    const req = new NextRequest(
      'http://localhost/api/admin/local-services/acme/bookings/b123/complete',
      {
        method: 'POST',
        body: JSON.stringify({ findings: 'Replaced air filter' }),
      }
    );

    const context = { params: Promise.resolve({ slug: 'acme', bookingId: 'b123' }) };
    const res = await POST(req, context);

    expect(res.status).toBe(200);
    expect(audit.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_slug: 'acme',
        action: 'technician_booking_complete',
        resource: 'booking:b123',
        status_code: 200,
        ip: '192.168.1.50',
        metadata: { report_id: 'rep-999' },
      })
    );
  });
});
