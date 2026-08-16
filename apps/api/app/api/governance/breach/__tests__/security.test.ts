import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  const originalEnvSecret = process.env.GOVERNANCE_BREACH_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOVERNANCE_BREACH_SECRET = 'valid-secret-token';
  });

  afterEach(() => {
    process.env.GOVERNANCE_BREACH_SECRET = originalEnvSecret;
  });

  it('returns 429 when rate limit is exceeded', async () => {
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date(),
    });

    const request = new NextRequest('http://localhost/api/governance/breach', {
      method: 'POST',
      body: JSON.stringify({
        tenant_id: 'tenant-123',
        title: 'Data Leak',
        description: 'Unauthorized access',
        discovered_at: new Date().toISOString(),
        severity: 'high',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error).toBe('Too many requests');
    expect(audit.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'governance_breach_report_failed',
        metadata: { reason: 'rate_limited' },
      })
    );
  });

  it('returns 401 when authorization header is invalid or missing', async () => {
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 10,
      resetAt: new Date(),
    });

    const request = new NextRequest('http://localhost/api/governance/breach', {
      method: 'POST',
      headers: {
        authorization: 'Bearer wrong-secret',
      },
      body: JSON.stringify({
        tenant_id: 'tenant-123',
        title: 'Data Leak',
        description: 'Unauthorized access',
        discovered_at: new Date().toISOString(),
        severity: 'high',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    expect(audit.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'governance_breach_report_failed',
        metadata: { reason: 'unauthorized' },
      })
    );
  });

  it('logs audit event on successful breach report', async () => {
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 10,
      resetAt: new Date(),
    });

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'breach-uuid-123', created_at: new Date().toISOString() },
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
        authorization: 'Bearer valid-secret-token',
      },
      body: JSON.stringify({
        tenant_id: 'tenant-123',
        title: 'Data Leak',
        description: 'Unauthorized access to DB',
        discovered_at: new Date().toISOString(),
        severity: 'critical',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.breach_id).toBe('breach-uuid-123');

    expect(audit.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'governance_breach_report',
        tenant_id: 'tenant-123',
        metadata: expect.objectContaining({
          breach_id: 'breach-uuid-123',
          severity: 'critical',
          title: 'Data Leak',
        }),
      })
    );
  });
});
