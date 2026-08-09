import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import * as rateLimiter from '../../../../../lib/rate-limiter';
import * as audit from '../../../../../lib/audit';
import * as supabase from '../../../../../lib/supabase';

const STATUS_CREATED = 201;
const STATUS_TOO_MANY_REQUESTS = 429;
const REMAINING_LIMIT = 99;

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

describe('POST /api/governance/consent security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 429 when rate limit is exceeded', async () => {
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date(),
    });

    const request = new NextRequest('http://localhost/api/governance/consent', {
      method: 'POST',
      body: JSON.stringify({
        tenant_id: 'test-tenant',
        subject_email: 'test@example.com',
        policy_id: 'privacy-policy',
        policy_version: '1.0.0',
        consent_type: 'marketing',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(STATUS_TOO_MANY_REQUESTS);
    const body = await response.json();
    expect(body.error).toBe('Too many requests');
  });

  it('logs an audit event on successful consent request', async () => {
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: REMAINING_LIMIT,
      resetAt: new Date(),
    });

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'consent-test-id', granted_at: new Date().toISOString() },
          error: null,
        }),
      }),
    });

    const mockChain = {
      schema: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          insert: mockInsert,
        }),
      }),
    };

    vi.mocked(supabase.getServiceClient).mockReturnValue(
      mockChain as unknown as ReturnType<typeof supabase.getServiceClient>
    );

    const request = new NextRequest('http://localhost/api/governance/consent', {
      method: 'POST',
      body: JSON.stringify({
        tenant_id: 'test-tenant',
        subject_email: 'test@example.com',
        policy_id: 'privacy-policy',
        policy_version: '1.0.0',
        consent_type: 'marketing',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(STATUS_CREATED);
    expect(audit.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_slug: 'test-tenant',
        action: 'governance_consent_record',
        resource: 'consent:consent-test-id',
      })
    );
  });
});
