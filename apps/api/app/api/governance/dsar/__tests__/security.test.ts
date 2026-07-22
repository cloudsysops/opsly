import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { GET } from '../[token]/route';
import * as rateLimiter from '@/lib/rate-limiter';
import * as audit from '@/lib/audit';
import * as supabase from '@/lib/supabase';

vi.mock('@/lib/rate-limiter', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('@/lib/audit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/audit')>();
  return {
    ...actual,
    logAuditEvent: vi.fn(),
    extractIp: vi.fn(),
  };
});

vi.mock('@/lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));

describe('POST /api/governance/dsar security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 429 when rate limit is exceeded', async () => {
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date(),
    });

    const request = new NextRequest('http://localhost/api/governance/dsar', {
      method: 'POST',
      body: JSON.stringify({
        tenant_id: 'test-tenant',
        subject_email: 'test@example.com',
        request_type: 'access',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error).toBe('Too many requests');
  });

  it('logs an audit event on successful request', async () => {
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetAt: new Date(),
    });

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'test-id', created_at: new Date().toISOString(), sla_deadline: new Date().toISOString() },
          error: null,
        }),
      }),
    });

    vi.mocked(supabase.getServiceClient).mockReturnValue({
      schema: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          insert: mockInsert,
        }),
      }),
    } as any);

    const request = new NextRequest('http://localhost/api/governance/dsar', {
      method: 'POST',
      body: JSON.stringify({
        tenant_id: 'test-tenant',
        subject_email: 'test@example.com',
        request_type: 'access',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    expect(audit.logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      tenant_slug: 'test-tenant',
      action: 'CREATE',
      resource: expect.stringContaining('dsar:'),
    }));
  });
});

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

    const request = new NextRequest('http://localhost/api/governance/dsar/someverificationtoken', {
      method: 'GET',
    });

    const response = await GET(request, { params: Promise.resolve({ token: 'someverificationtoken' }) });
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error).toBe('Too many requests');
  });

  it('performs verification and logs an audit event on successful verification', async () => {
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetAt: new Date(),
    });

    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'test-id',
        tenant_id: 'test-tenant',
        subject_email: 'test@example.com',
        request_type: 'access',
        status: 'received',
        created_at: new Date().toISOString(),
        sla_deadline: new Date().toISOString(),
      },
      error: null,
    });

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    vi.mocked(supabase.getServiceClient).mockReturnValue({
      schema: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: mockSingle,
            }),
          }),
          update: mockUpdate,
        }),
      }),
    } as any);

    const request = new NextRequest('http://localhost/api/governance/dsar/someverificationtoken', {
      method: 'GET',
    });

    const response = await GET(request, { params: Promise.resolve({ token: 'someverificationtoken' }) });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);

    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      status: 'verified',
    }));

    expect(audit.logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      tenant_slug: 'test-tenant',
      action: 'VERIFY',
      resource: 'dsar:test-id',
    }));
  });
});
