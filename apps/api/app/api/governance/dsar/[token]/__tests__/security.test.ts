import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';
import * as rateLimiter from '../../../../../../lib/rate-limiter';
import * as audit from '../../../../../../lib/audit';
import * as supabase from '../../../../../../lib/supabase';

const HTTP_STATUS_OK = 200;
const HTTP_STATUS_BAD_REQUEST = 400;
const HTTP_STATUS_NOT_FOUND = 404;
const HTTP_STATUS_TOO_MANY_REQUESTS = 429;

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

    const request = new NextRequest('http://localhost/api/governance/dsar/token123456789');
    const response = await GET(request, {
      params: Promise.resolve({ token: 'token123456789' }),
    });

    expect(response.status).toBe(HTTP_STATUS_TOO_MANY_REQUESTS);
    const body = await response.json();
    expect(body.error).toBe('Too many requests');
  });

  it('returns 400 when token length is too short', async () => {
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetAt: new Date(),
    });

    const request = new NextRequest('http://localhost/api/governance/dsar/short');
    const response = await GET(request, {
      params: Promise.resolve({ token: 'short' }),
    });

    expect(response.status).toBe(HTTP_STATUS_BAD_REQUEST);
    const body = await response.json();
    expect(body.error).toBe('Invalid token');
  });

  it('returns 404 when request is not found in DB', async () => {
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetAt: new Date(),
    });

    vi.mocked(supabase.getServiceClient).mockReturnValue({
      schema: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Not found' },
              }),
            }),
          }),
        }),
      }),
    } as unknown as ReturnType<typeof supabase.getServiceClient>);

    const request = new NextRequest('http://localhost/api/governance/dsar/validtoken123');
    const response = await GET(request, {
      params: Promise.resolve({ token: 'validtoken123' }),
    });

    expect(response.status).toBe(HTTP_STATUS_NOT_FOUND);
    const body = await response.json();
    expect(body.error).toBe('Request not found');
  });

  it('marks as verified and logs audit event on success', async () => {
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetAt: new Date(),
    });

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'dsar-123',
              tenant_id: 'acme',
              subject_email: 'test@example.com',
              request_type: 'access',
              status: 'received',
              sla_deadline: '2026-07-27T00:00:00.000Z',
            },
            error: null,
          }),
        }),
      }),
      update: mockUpdate,
    });

    vi.mocked(supabase.getServiceClient).mockReturnValue({
      schema: vi.fn().mockReturnValue({
        from: mockFrom,
      }),
    } as unknown as ReturnType<typeof supabase.getServiceClient>);

    const request = new NextRequest('http://localhost/api/governance/dsar/validtoken123');
    const response = await GET(request, {
      params: Promise.resolve({ token: 'validtoken123' }),
    });

    expect(response.status).toBe(HTTP_STATUS_OK);
    const body = await response.json();
    expect(body.ok).toBe(true);

    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'verified' }));

    expect(audit.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_slug: 'acme',
        action: 'VERIFY',
        resource: 'dsar:dsar-123',
      })
    );
  });
});
