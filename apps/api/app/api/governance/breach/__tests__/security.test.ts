import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import * as rateLimiter from '@/lib/rate-limiter';
import * as audit from '@/lib/audit';
import * as supabase from '@/lib/supabase';
import { HTTP_STATUS } from '@/lib/constants';

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

describe('POST /api/governance/breach security', () => {
  const SECRET = 'test-secret';
  const VALID_PAYLOAD = {
    tenant_id: 'test-tenant',
    title: 'Data Breach',
    description: 'Sensitive data exposed',
    discovered_at: new Date().toISOString(),
    severity: 'high',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOVERNANCE_BREACH_SECRET = SECRET;
    vi.mocked(audit.extractIp).mockReturnValue('127.0.0.1');
  });

  it('returns 429 when rate limit is exceeded', async () => {
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date(),
    });

    const request = new NextRequest('http://localhost/api/governance/breach', {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${SECRET}`,
      },
      body: JSON.stringify(VALID_PAYLOAD),
    });

    const response = await POST(request);
    expect(response.status).toBe(HTTP_STATUS.TOO_MANY_REQUESTS);
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
          data: { id: 'breach-123', created_at: new Date().toISOString() },
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

    const request = new NextRequest('http://localhost/api/governance/breach', {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${SECRET}`,
      },
      body: JSON.stringify(VALID_PAYLOAD),
    });

    const response = await POST(request);
    expect(response.status).toBe(HTTP_STATUS.CREATED);

    expect(audit.logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      tenant_slug: 'test-tenant',
      action: 'log_breach',
      resource: 'governance:breach:breach-123',
      ip: '127.0.0.1',
    }));
  });

  it('returns 401 when authorization is missing or invalid', async () => {
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetAt: new Date(),
    });

    const request = new NextRequest('http://localhost/api/governance/breach', {
      method: 'POST',
      headers: {
        'authorization': 'Bearer wrong-secret',
      },
      body: JSON.stringify(VALID_PAYLOAD),
    });

    const response = await POST(request);
    expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
  });
});
