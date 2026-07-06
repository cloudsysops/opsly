import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
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
  requireAdminAccessUnlessDemoRead: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));

describe('Defense Audits API Security', () => {
  const mockUuid = '12345678-1234-1234-1234-123456789012';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/defense/audits', () => {
    it('returns 429 when rate limit is exceeded', async () => {
      vi.mocked(auth.requireAdminAccessUnlessDemoRead).mockResolvedValue(null);
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date(),
      });

      const request = new NextRequest('http://localhost/api/defense/audits');
      const response = await GET(request);

      expect(response.status).toBe(429);
    });

    it('allows access when rate limit is not exceeded', async () => {
      vi.mocked(auth.requireAdminAccessUnlessDemoRead).mockResolvedValue(null);
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 10,
        resetAt: new Date(),
      });

      const mockQuery = {
        schema: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        eq: vi.fn().mockReturnThis(),
      };

      vi.mocked(supabase.getServiceClient).mockReturnValue(mockQuery as any);

      const request = new NextRequest('http://localhost/api/defense/audits');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/defense/audits', () => {
    it('returns 429 when rate limit is exceeded', async () => {
      vi.mocked(auth.requireAdminAccess).mockResolvedValue(null);
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date(),
      });

      const request = new NextRequest('http://localhost/api/defense/audits', {
        method: 'POST',
        body: JSON.stringify({ tenant_id: mockUuid, audit_type: 'security' }),
      });
      const response = await POST(request);

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
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: mockUuid, slug: 's1', status: 'active', plan: 'pro' }, error: null }),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'audit-123' }, error: null }),
      };

      vi.mocked(supabase.getServiceClient).mockReturnValue(mockQuery as any);

      // Mocking fetch for orchestrator enqueue which happens in executePostDefenseAudit
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      });

      const request = new NextRequest('http://localhost/api/defense/audits', {
        method: 'POST',
        body: JSON.stringify({ tenant_id: mockUuid, audit_type: 'security' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      expect(audit.logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
        action: 'CREATE_DEFENSE_AUDIT',
        tenant_slug: mockUuid
      }));
    });
  });
});
