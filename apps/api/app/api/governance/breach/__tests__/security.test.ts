import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import * as audit from '../../../../../lib/audit';
import * as rateLimiter from '../../../../../lib/rate-limiter';
import * as supabase from '../../../../../lib/supabase';

vi.mock('../../../../../lib/rate-limiter', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('../../../../../lib/audit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../../lib/audit')>();
  return {
    ...actual,
    logAuditEvent: vi.fn(),
    extractIp: vi.fn().mockReturnValue('127.0.0.1'),
  };
});

vi.mock('../../../../../lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));

describe('POST /api/governance/breach security', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, GOVERNANCE_BREACH_SECRET: 'test-secret-123' };
  });

  afterEach(() => {
    process.env = originalEnv;
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
        authorization: 'Bearer test-secret-123',
      },
      body: JSON.stringify({
        tenant_id: 'test-tenant',
        title: 'Data Leak',
        description: 'Exposed S3 bucket',
        discovered_at: new Date().toISOString(),
        severity: 'high',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(429);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe('Too many requests');
    expect(rateLimiter.checkRateLimit).toHaveBeenCalledWith('governance-breach:127.0.0.1');
  });

  it('returns 401 when authorization header is missing or invalid', async () => {
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
        tenant_id: 'test-tenant',
        title: 'Data Leak',
        description: 'Exposed S3 bucket',
        discovered_at: new Date().toISOString(),
        severity: 'high',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe('Unauthorized');
  });

  it('successfully creates breach record and logs audit event when authorized', async () => {
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 10,
      resetAt: new Date(),
    });

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'breach-id-123', created_at: new Date().toISOString() },
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
        authorization: 'Bearer test-secret-123',
      },
      body: JSON.stringify({
        tenant_id: 'test-tenant',
        title: 'Data Leak',
        description: 'Exposed S3 bucket',
        discovered_at: new Date().toISOString(),
        severity: 'high',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    const body = (await response.json()) as { ok: boolean; breach_id: string };
    expect(body.ok).toBe(true);
    expect(body.breach_id).toBe('breach-id-123');

    expect(audit.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_slug: 'test-tenant',
        action: 'BREACH_LOGGED',
        resource: 'governance_breach:breach-id-123',
        ip: '127.0.0.1',
        metadata: {
          severity: 'high',
          title: 'Data Leak',
        },
      })
    );
  });
});
