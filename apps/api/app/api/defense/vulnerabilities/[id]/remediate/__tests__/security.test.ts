import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import * as rateLimiter from '@/lib/rate-limiter';
import * as audit from '@/lib/audit';
import * as auth from '@/lib/auth';
import * as supabase from '@/lib/supabase';

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

vi.mock('@/lib/auth', () => ({
  requireAdminAccess: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));

describe('Vulnerability Remediate API Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 429 when rate limit is exceeded', async () => {
    vi.mocked(auth.requireAdminAccess).mockResolvedValue(null);
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date(),
    });

    const request = new NextRequest('http://localhost/api/defense/vulnerabilities/vuln-1234567890/remediate', {
      method: 'POST',
      body: JSON.stringify({ notes: 'fixed' }),
    });
    const ctx = { params: Promise.resolve({ id: 'vuln-1234567890' }) };
    const response = await POST(request, ctx);

    expect(response.status).toBe(429);
  });

  it('logs audit event on successful POST', async () => {
    vi.mocked(auth.requireAdminAccess).mockResolvedValue(null);
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 10,
      resetAt: new Date(),
    });

    const mockQuery = {
      schema: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'vuln-1234567890', tenant_id: 't1' },
        error: null
      }),
    };

    vi.mocked(supabase.getServiceClient).mockReturnValue(mockQuery as any);

    const request = new NextRequest('http://localhost/api/defense/vulnerabilities/vuln-1234567890/remediate', {
      method: 'POST',
      body: JSON.stringify({ notes: 'fixed' }),
    });
    const ctx = { params: Promise.resolve({ id: 'vuln-1234567890' }) };

    const response = await POST(request, ctx);
    expect(response.status).toBe(200);
    expect(audit.logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      action: 'REMEDIATE_VULNERABILITY',
      resource: 'defense:vulnerabilities:vuln-1234567890'
    }));
  });
});
