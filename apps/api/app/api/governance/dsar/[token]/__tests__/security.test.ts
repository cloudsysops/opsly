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

    const request = new NextRequest('http://localhost/api/governance/dsar/test-token-valid-len', {
      method: 'GET',
    });

    const response = await GET(request, {
      params: Promise.resolve({ token: 'test-token-valid-len' }),
    });
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error).toBe('Too many requests');
  });

  it('returns 400 when token is too short', async () => {
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetAt: new Date(),
    });

    const request = new NextRequest('http://localhost/api/governance/dsar/short', {
      method: 'GET',
    });

    const response = await GET(request, { params: Promise.resolve({ token: 'short' }) });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid token');
  });

  it('returns 404 when request is not found', async () => {
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetAt: new Date(),
    });

    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Not found' },
    });

    vi.mocked(supabase.getServiceClient).mockReturnValue({
      schema: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: mockSingle,
            }),
          }),
        }),
      }),
    } as any);

    const request = new NextRequest('http://localhost/api/governance/dsar/test-token-not-found', {
      method: 'GET',
    });

    const response = await GET(request, {
      params: Promise.resolve({ token: 'test-token-not-found' }),
    });
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('Request not found');
  });

  it('logs an audit event and returns 200 on successful request', async () => {
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetAt: new Date(),
    });

    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'test-dsar-id',
        tenant_id: 'test-tenant',
        subject_email: 'subject@example.com',
        request_type: 'access',
        status: 'verified',
        created_at: new Date().toISOString(),
        sla_deadline: new Date().toISOString(),
        fulfilled_at: null,
      },
      error: null,
    });

    vi.mocked(supabase.getServiceClient).mockReturnValue({
      schema: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: mockSingle,
            }),
          }),
        }),
      }),
    } as any);

    const request = new NextRequest('http://localhost/api/governance/dsar/test-token-valid-len', {
      method: 'GET',
    });

    const response = await GET(request, {
      params: Promise.resolve({ token: 'test-token-valid-len' }),
    });
    expect(response.status).toBe(200);

    expect(audit.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_slug: 'test-tenant',
        action: 'VERIFY',
        resource: 'dsar:test-dsar-id',
      })
    );
  });
});
