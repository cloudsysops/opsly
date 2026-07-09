import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GET, POST } from '../route';
import { DELETE } from '../[id]/route';
import * as rateLimiter from '@/lib/rate-limiter';
import * as audit from '@/lib/audit';
import { requireAdminAccess } from '@/lib/auth';

vi.mock('@/lib/auth', () => ({
  requireAdminAccess: vi.fn(),
}));

vi.mock('@/lib/rate-limiter', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('@/lib/audit', () => ({
  extractIp: vi.fn(),
  logAuditEvent: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  getServiceClient: vi.fn(() => ({
    schema: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null }),
    single: vi.fn().mockResolvedValue({
      data: { id: 'test-id', name: 'test', key_prefix: 'opsly_abc' },
      error: null,
    }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
  })),
}));

describe('API Keys V1 Security (Rate Limiting & Audit)', () => {
  const mockIp = '127.0.0.1';
  const tenantId = '00000000-0000-0000-0000-000000000000';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(audit.extractIp).mockReturnValue(mockIp);
    vi.mocked(requireAdminAccess).mockResolvedValue(null as unknown as Response | null);
  });

  describe('Rate Limiting', () => {
    it('should block GET when rate limit exceeded', async () => {
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date(),
      });

      const req = new Request('http://localhost/api/v1/keys');
      const res = await GET(req);

      expect(res.status).toBe(429);
      expect(rateLimiter.checkRateLimit).toHaveBeenCalledWith(`v1-keys-list:${mockIp}`);
    });

    it('should block POST when rate limit exceeded', async () => {
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date(),
      });

      const req = new Request('http://localhost/api/v1/keys', { method: 'POST' });
      const res = await POST(req);

      expect(res.status).toBe(429);
      expect(rateLimiter.checkRateLimit).toHaveBeenCalledWith(`v1-keys-create:${mockIp}`);
    });

    it('should block DELETE when rate limit exceeded', async () => {
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date(),
      });

      const req = new Request('http://localhost/api/v1/keys/some-id', { method: 'DELETE' });
      const res = await DELETE(req, { params: Promise.resolve({ id: 'some-id' }) });

      expect(res.status).toBe(429);
      expect(rateLimiter.checkRateLimit).toHaveBeenCalledWith(`v1-keys-delete:${mockIp}`);
    });
  });

  describe('Audit Logging', () => {
    beforeEach(() => {
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 10,
        resetAt: new Date(),
      });
    });

    it('should log audit event on successful POST', async () => {
      const req = new Request('http://localhost/api/v1/keys', {
        method: 'POST',
        headers: {
          'x-tenant-id': tenantId,
          'user-agent': 'test-agent',
        },
        body: JSON.stringify({ name: 'test key' }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(audit.logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_slug: tenantId,
          action: 'create_api_key',
          resource: expect.stringContaining('api_key:'),
          ip: mockIp,
          user_agent: 'test-agent',
        })
      );
    });

    it('should log audit event on successful DELETE', async () => {
      const keyId = '00000000-0000-0000-0000-000000000001';
      const req = new Request(`http://localhost/api/v1/keys/${keyId}`, {
        method: 'DELETE',
        headers: {
          'x-tenant-id': tenantId,
          'user-agent': 'test-agent',
        },
      });

      const res = await DELETE(req, { params: Promise.resolve({ id: keyId }) });
      expect(res.status).toBe(204);
      expect(audit.logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_slug: tenantId,
          action: 'revoke_api_key',
          resource: `api_key:${keyId}`,
          ip: mockIp,
          user_agent: 'test-agent',
        })
      );
    });
  });
});
