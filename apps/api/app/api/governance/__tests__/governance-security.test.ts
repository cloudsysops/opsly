import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as POSTConsent } from '../consent/route';
import { GET as GETVerify } from '../dsar/[token]/route';
import * as rateLimiter from '../../../../lib/rate-limiter';
import * as audit from '../../../../lib/audit';
import * as supabase from '../../../../lib/supabase';

vi.mock('../../../../lib/rate-limiter', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('../../../../lib/audit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../lib/audit')>();
  return {
    ...actual,
    logAuditEvent: vi.fn(),
    extractIp: vi.fn(),
  };
});

vi.mock('../../../../lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));

describe('Governance security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/governance/consent', () => {
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
          policy_id: 'test-policy',
          policy_version: '1.0',
          consent_type: 'marketing',
        }),
      });

      const response = await POSTConsent(request);
      expect(response.status).toBe(429);
    });

    it('logs audit event on successful consent', async () => {
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 10,
        resetAt: new Date(),
      });

      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: 'consent-123', granted_at: new Date().toISOString() },
        error: null,
      });

      vi.mocked(supabase.getServiceClient).mockReturnValue({
        schema: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: mockSingle,
              }),
            }),
          }),
        }),
      } as any);

      const request = new NextRequest('http://localhost/api/governance/consent', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: 'test-tenant',
          policy_id: 'test-policy',
          policy_version: '1.0',
          consent_type: 'marketing',
        }),
      });

      await POSTConsent(request);
      expect(audit.logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
        action: 'CREATE',
        resource: 'consent:consent-123',
      }));
    });
  });

  describe('GET /api/governance/dsar/[token]', () => {
    it('returns 429 when rate limit is exceeded', async () => {
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date(),
      });

      const request = new NextRequest('http://localhost/api/governance/dsar/valid-token-length', {
        method: 'GET',
      });

      const response = await GETVerify(request, { params: Promise.resolve({ token: 'valid-token-length' }) });
      expect(response.status).toBe(429);
    });

    it('logs audit event on verification failure (not found)', async () => {
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 10,
        resetAt: new Date(),
      });

      vi.mocked(supabase.getServiceClient).mockReturnValue({
        schema: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        }),
      } as any);

      const request = new NextRequest('http://localhost/api/governance/dsar/test-token-123', {
        method: 'GET',
      });

      await GETVerify(request, { params: Promise.resolve({ token: 'test-token-123' }) });
      expect(audit.logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
        action: 'VERIFY_FAIL',
      }));
    });
  });
});
