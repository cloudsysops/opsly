import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import * as rateLimiter from '../../../../../lib/rate-limiter';
import * as audit from '../../../../../lib/audit';
import * as supabase from '../../../../../lib/supabase';

vi.mock('../../../../../lib/rate-limiter', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('../../../../../lib/audit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../../lib/audit')>();
  return {
    ...actual,
    logAuditEvent: vi.fn(),
    extractIp: vi.fn(),
  };
});

vi.mock('../../../../../lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));

describe('POST /api/governance/breach security', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, GOVERNANCE_BREACH_SECRET: 'test-secret' };
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
        authorization: 'Bearer test-secret',
      },
      body: JSON.stringify({
        tenant_id: 'test-tenant',
        title: 'Data Breach 1',
        description: 'Sensitive files leaked',
        discovered_at: new Date().toISOString(),
        severity: 'critical',
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
          data: { id: 'test-id', created_at: new Date().toISOString() },
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
        authorization: 'Bearer test-secret',
      },
      body: JSON.stringify({
        tenant_id: 'test-tenant',
        title: 'Data Breach 1',
        description: 'Sensitive files leaked',
        discovered_at: new Date().toISOString(),
        severity: 'critical',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    expect(audit.logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      tenant_slug: 'test-tenant',
      action: 'governance_breach_report',
      resource: expect.stringContaining('breach:'),
    }));
  });
});
