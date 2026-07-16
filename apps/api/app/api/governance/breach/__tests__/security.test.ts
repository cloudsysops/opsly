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
  const BREACH_SECRET = 'test-secret';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOVERNANCE_BREACH_SECRET = BREACH_SECRET;
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
        authorization: `Bearer ${BREACH_SECRET}`,
      },
      body: JSON.stringify({
        tenant_id: 'test-tenant',
        title: 'Data Breach',
        description: 'Sensitive data leaked',
        discovered_at: new Date().toISOString(),
        severity: 'high',
      }),
    });

    const response = await POST(request);
    // This should fail initially because rate limiting is NOT implemented yet
    expect(response.status).toBe(429);
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
    } as unknown as ReturnType<typeof supabase.getServiceClient>);

    const request = new NextRequest('http://localhost/api/governance/breach', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${BREACH_SECRET}`,
      },
      body: JSON.stringify({
        tenant_id: 'test-tenant',
        title: 'Data Breach',
        description: 'Sensitive data leaked',
        discovered_at: new Date().toISOString(),
        severity: 'high',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    // This should fail initially because audit logging is NOT implemented yet
    expect(audit.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_slug: 'test-tenant',
        action: 'governance_breach_report',
        resource: expect.stringContaining('breach:'),
      })
    );
  });
});
