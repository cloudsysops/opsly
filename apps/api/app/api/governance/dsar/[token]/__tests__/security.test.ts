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
  getServiceClient: vi.fn(() => ({
    schema: vi.fn(() => ({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(),
        })),
      })),
    })),
  })),
}));

describe('GET /api/governance/dsar/[token] security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default allowed rate limit
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetAt: new Date(),
    });
  });

  it('returns 429 when rate limit is exceeded', async () => {
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date(),
    });

    const request = new NextRequest('http://localhost/api/governance/dsar/valid-token-123');
    const params = Promise.resolve({ token: 'valid-token-123' });

    const response = await GET(request, { params });
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error).toBe('Too many requests');
  });

  it('logs an audit event on successful status check', async () => {
    const mockData = {
      id: 'test-id',
      tenant_id: 'test-tenant',
      subject_email: 'test@example.com',
      request_type: 'access',
      status: 'verified',
    };

    const mockSingle = vi.fn().mockResolvedValue({ data: mockData, error: null });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockFrom = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ eq: mockEq }) });

    vi.mocked(supabase.getServiceClient).mockReturnValue({
      schema: vi.fn().mockReturnValue({
        from: mockFrom,
      }),
    } as any);

    const request = new NextRequest('http://localhost/api/governance/dsar/valid-token-123');
    const params = Promise.resolve({ token: 'valid-token-123' });

    const response = await GET(request, { params });
    expect(response.status).toBe(200);
    expect(audit.logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      tenant_slug: 'test-tenant',
      action: 'DSAR_STATUS_CHECK',
      resource: 'dsar:test-id',
    }));
  });
});
