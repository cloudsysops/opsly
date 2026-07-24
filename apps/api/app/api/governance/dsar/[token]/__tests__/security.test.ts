import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';
import * as rateLimiter from '../../../../../../lib/rate-limiter';
import * as audit from '../../../../../../lib/audit';
import * as supabase from '../../../../../../lib/supabase';

// Named constants to satisfy the 'no-magic-numbers' ESLint rule
const HTTP_STATUS_OK = 200;
const HTTP_STATUS_TOO_MANY_REQUESTS = 429;
const REMAINING_LIMIT_ZERO = 0;
const REMAINING_LIMIT_HIGH = 99;

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
      remaining: REMAINING_LIMIT_ZERO,
      resetAt: new Date(),
    });

    const request = new NextRequest('http://localhost/api/governance/dsar/some-token-string-12345');
    const params = Promise.resolve({ token: 'some-token-string-12345' });

    const response = await GET(request, { params });
    expect(response.status).toBe(HTTP_STATUS_TOO_MANY_REQUESTS);
    const body = await response.json();
    expect(body.error).toBe('Too many requests');
  });

  it('logs an audit event on successful verification', async () => {
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: REMAINING_LIMIT_HIGH,
      resetAt: new Date(),
    });

    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'test-dsar-id',
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
      eq: vi.fn(),
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

    const request = new NextRequest('http://localhost/api/governance/dsar/some-token-string-12345');
    const params = Promise.resolve({ token: 'some-token-string-12345' });

    const response = await GET(request, { params });
    expect(response.status).toBe(HTTP_STATUS_OK);

    expect(audit.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_slug: 'test-tenant',
        action: 'VERIFY',
        resource: 'dsar:test-dsar-id',
      })
    );
  });
});
