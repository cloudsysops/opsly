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
    extractIp: vi.fn().mockReturnValue('127.0.0.1'),
  };
});

vi.mock('@/lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));

describe('POST /api/governance/consent security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enforces rate limiting', async () => {
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date(),
    });

    const request = new NextRequest('http://localhost/api/governance/consent', {
      method: 'POST',
      body: JSON.stringify({
        tenant_id: 'test-tenant',
        policy_id: 'policy-1',
        policy_version: '1.0',
        consent_type: 'marketing',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(HTTP_STATUS.TOO_MANY_REQUESTS);
    const body = await response.json();
    expect(body.error).toBe('Too many requests');
  });

  it('logs audit event on successful consent', async () => {
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 10,
      resetAt: new Date(),
    });

    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: 'consent-1', granted_at: new Date().toISOString() },
      error: null,
    });

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: mockSingle,
      }),
    });

    vi.mocked(supabase.getServiceClient).mockReturnValue({
      schema: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          insert: mockInsert,
        }),
      }),
    } as any);

    const request = new NextRequest('http://localhost/api/governance/consent', {
      method: 'POST',
      body: JSON.stringify({
        tenant_id: 'test-tenant',
        policy_id: 'policy-1',
        policy_version: '1.0',
        consent_type: 'marketing',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(HTTP_STATUS.CREATED);
    expect(audit.logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      action: 'GRANT',
      resource: 'consent:consent-1',
    }));
  });
});
