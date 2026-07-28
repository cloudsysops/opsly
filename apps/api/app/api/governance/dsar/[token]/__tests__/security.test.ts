import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';
import * as rateLimiter from '../../../../../../lib/rate-limiter';
import * as audit from '../../../../../../lib/audit';
import * as supabase from '../../../../../../lib/supabase';

vi.mock('../../../../../../lib/rate-limiter', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('../../../../../../lib/audit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../../../lib/audit')>();
  return {
    ...actual,
    logAuditEvent: vi.fn(),
    extractIp: vi.fn(),
  };
});

vi.mock('../../../../../../lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));

describe('GET /api/governance/dsar/[token] security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 429 when rate limit is exceeded', async () => {
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date(),
    });

    const request = new NextRequest(
      'http://localhost/api/governance/dsar/test-verification-token',
      {
        method: 'GET',
      }
    );

    const response = await GET(request, {
      params: Promise.resolve({ token: 'test-verification-token' }),
    });
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error).toBe('Too many requests');
  });

  it('returns 404 when request is not found', async () => {
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetAt: new Date(),
    });

    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: new Error('Not found'),
    });

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: mockSingle,
    });

    vi.mocked(supabase.getServiceClient).mockReturnValue({
      schema: vi.fn().mockReturnValue({
        from: mockFrom,
      }),
    } as any);

    const request = new NextRequest(
      'http://localhost/api/governance/dsar/test-verification-token',
      {
        method: 'GET',
      }
    );

    const response = await GET(request, {
      params: Promise.resolve({ token: 'test-verification-token' }),
    });
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('Request not found');
  });

  it('marks state as verified and logs audit event when status is received', async () => {
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetAt: new Date(),
    });

    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'dsar-id-123',
        tenant_id: 'test-tenant',
        subject_email: 'test@example.com',
        request_type: 'access',
        status: 'received',
        created_at: new Date().toISOString(),
        sla_deadline: new Date().toISOString(),
        fulfilled_at: null,
      },
      error: null,
    });

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: mockSingle,
      update: mockUpdate,
    });

    vi.mocked(supabase.getServiceClient).mockReturnValue({
      schema: vi.fn().mockReturnValue({
        from: mockFrom,
      }),
    } as any);

    const request = new NextRequest(
      'http://localhost/api/governance/dsar/test-verification-token',
      {
        method: 'GET',
      }
    );

    const response = await GET(request, {
      params: Promise.resolve({ token: 'test-verification-token' }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);

    // Verify update was called
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'verified',
      })
    );

    // Verify audit event logged
    expect(audit.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_slug: 'test-tenant',
        action: 'VERIFY',
        resource: 'dsar:dsar-id-123',
      })
    );
  });

  it('does not re-verify or log audit event if status is already verified', async () => {
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetAt: new Date(),
    });

    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'dsar-id-123',
        tenant_id: 'test-tenant',
        subject_email: 'test@example.com',
        request_type: 'access',
        status: 'verified',
        created_at: new Date().toISOString(),
        sla_deadline: new Date().toISOString(),
        fulfilled_at: null,
      },
      error: null,
    });

    const mockUpdate = vi.fn();

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: mockSingle,
      update: mockUpdate,
    });

    vi.mocked(supabase.getServiceClient).mockReturnValue({
      schema: vi.fn().mockReturnValue({
        from: mockFrom,
      }),
    } as any);

    const request = new NextRequest(
      'http://localhost/api/governance/dsar/test-verification-token',
      {
        method: 'GET',
      }
    );

    const response = await GET(request, {
      params: Promise.resolve({ token: 'test-verification-token' }),
    });
    expect(response.status).toBe(200);

    // Verify update was NOT called
    expect(mockUpdate).not.toHaveBeenCalled();

    // Verify audit event was NOT logged
    expect(audit.logAuditEvent).not.toHaveBeenCalled();
  });
});
