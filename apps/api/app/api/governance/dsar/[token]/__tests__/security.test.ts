import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';
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

    const request = new NextRequest('http://localhost/api/governance/dsar/token1234567890', {
      method: 'GET',
    });

    const response = await GET(request, { params: Promise.resolve({ token: 'token1234567890' }) });
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error).toBe('Too many requests');
  });

  it('logs audit event on successful token retrieval/verification', async () => {
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetAt: new Date(),
    });

    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'dsar-123',
        tenant_id: 'test-tenant',
        subject_email: 'user@example.com',
        request_type: 'access',
        status: 'received',
      },
      error: null,
    });

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
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
    } as unknown as ReturnType<typeof supabase.getServiceClient>);

    const request = new NextRequest('http://localhost/api/governance/dsar/token1234567890', {
      method: 'GET',
    });

    const response = await GET(request, { params: Promise.resolve({ token: 'token1234567890' }) });
    expect(response.status).toBe(200);

    expect(audit.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_slug: 'test-tenant',
        action: 'VERIFY',
        resource: 'dsar:dsar-123',
      })
    );
  });
});
