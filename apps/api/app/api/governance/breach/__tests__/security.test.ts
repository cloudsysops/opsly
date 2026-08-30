import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import * as rateLimiter from '@/lib/rate-limiter-memory';
import * as audit from '@/lib/audit';
import * as supabase from '@/lib/supabase';

vi.mock('@/lib/rate-limiter-memory', () => ({
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

describe('POST /api/governance/breach security', () => {
  const originalEnv = process.env.GOVERNANCE_BREACH_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOVERNANCE_BREACH_SECRET = 'super-secret-breach-token';
  });

  afterEach(() => {
    process.env.GOVERNANCE_BREACH_SECRET = originalEnv;
  });

  it('returns 429 when rate limit is exceeded', async () => {
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date(),
    });

    const request = new NextRequest('http://localhost/api/governance/breach', {
      method: 'POST',
      headers: { authorization: 'Bearer super-secret-breach-token' },
    });

    const response = await POST(request);
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error).toBe('Too many requests');
  });

  it('returns 401 when token is missing or invalid', async () => {
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetAt: new Date(),
    });

    const requestNoAuth = new NextRequest('http://localhost/api/governance/breach', {
      method: 'POST',
    });

    const responseNoAuth = await POST(requestNoAuth);
    expect(responseNoAuth.status).toBe(401);

    const requestBadToken = new NextRequest('http://localhost/api/governance/breach', {
      method: 'POST',
      headers: { authorization: 'Bearer wrong-secret-token' },
    });

    const responseBadToken = await POST(requestBadToken);
    expect(responseBadToken.status).toBe(401);
  });

  it('logs breach and audit event when token is valid and payload is correct', async () => {
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetAt: new Date(),
    });

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'breach-123', created_at: new Date().toISOString() },
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

    const payload = {
      tenant_id: 'tenant-acme',
      title: 'Data leak in S3 bucket',
      description: 'Public read permissions on legacy export bucket',
      discovered_at: new Date().toISOString(),
      severity: 'high',
      affected_data_types: ['pii', 'email'],
    };

    const request = new NextRequest('http://localhost/api/governance/breach', {
      method: 'POST',
      headers: {
        authorization: 'Bearer super-secret-breach-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.breach_id).toBe('breach-123');

    expect(audit.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_slug: 'tenant-acme',
        action: 'governance_breach_log_created',
        resource: '/api/governance/breach/breach-123',
      })
    );
  });
});
