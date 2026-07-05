import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GET, POST } from '../route';
import { DELETE } from '../[id]/route';
import { requireAdminAccess } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { checkRateLimit } from '@/lib/rate-limiter';

vi.mock('@/lib/auth', () => ({
  requireAdminAccess: vi.fn(),
}));

vi.mock('@/lib/audit', () => ({
  logAuditEvent: vi.fn(),
  extractIp: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/rate-limiter', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10, resetAt: new Date() }),
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
    single: vi.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
  })),
}));

describe('API Keys V1 Security Auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  });

  const tenantId = '00000000-0000-0000-0000-000000000000';

  describe('GET /api/v1/keys', () => {
    it('should return 403 when admin access is denied', async () => {
      vi.mocked(requireAdminAccess).mockResolvedValue(
        Response.json({ error: 'forbidden' }, { status: 403 }) as never
      );
      const req = new Request('http://localhost/api/v1/keys', {
        headers: { 'x-tenant-id': tenantId },
      });
      const res = await GET(req);
      expect(res.status).toBe(403);
    });

    it('should call logAuditEvent on successful GET', async () => {
      vi.mocked(requireAdminAccess).mockResolvedValue(null);
      const req = new Request('http://localhost/api/v1/keys', {
        headers: { 'x-tenant-id': tenantId },
      });
      await GET(req);
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LIST_KEYS',
          resource: '/api/v1/keys',
          metadata: expect.objectContaining({ tenant_id: tenantId }),
        })
      );
    });
  });

  describe('POST /api/v1/keys', () => {
    it('should return 403 when admin access is denied', async () => {
      vi.mocked(requireAdminAccess).mockResolvedValue(
        Response.json({ error: 'forbidden' }, { status: 403 }) as never
      );
      const req = new Request('http://localhost/api/v1/keys', {
        method: 'POST',
        headers: { 'x-tenant-id': tenantId },
        body: JSON.stringify({ name: 'test key' }),
      });
      const res = await POST(req);
      expect(res.status).toBe(403);
    });

    it('should return 429 when rate limit is exceeded', async () => {
      vi.mocked(requireAdminAccess).mockResolvedValue(null);
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date(),
      });
      const req = new Request('http://localhost/api/v1/keys', {
        method: 'POST',
        headers: { 'x-tenant-id': tenantId },
        body: JSON.stringify({ name: 'test key' }),
      });
      const res = await POST(req);
      expect(res.status).toBe(429);
    });

    it('should call logAuditEvent on successful POST', async () => {
      vi.mocked(requireAdminAccess).mockResolvedValue(null);
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 10,
        resetAt: new Date(),
      });
      const req = new Request('http://localhost/api/v1/keys', {
        method: 'POST',
        headers: { 'x-tenant-id': tenantId },
        body: JSON.stringify({ name: 'test key' }),
      });
      await POST(req);
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE_KEY',
          resource: '/api/v1/keys',
          metadata: expect.objectContaining({ tenant_id: tenantId }),
        })
      );
    });
  });

  describe('DELETE /api/v1/keys/[id]', () => {
    it('should return 403 when admin access is denied', async () => {
      vi.mocked(requireAdminAccess).mockResolvedValue(
        Response.json({ error: 'forbidden' }, { status: 403 }) as never
      );
      const req = new Request('http://localhost/api/v1/keys/some-id', {
        method: 'DELETE',
        headers: { 'x-tenant-id': tenantId },
      });
      const res = await DELETE(req, {
        params: Promise.resolve({ id: '00000000-0000-0000-0000-000000000001' }),
      });
      expect(res.status).toBe(403);
    });

    it('should return 429 when rate limit is exceeded', async () => {
      vi.mocked(requireAdminAccess).mockResolvedValue(null);
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date(),
      });
      const req = new Request('http://localhost/api/v1/keys/some-id', {
        method: 'DELETE',
        headers: { 'x-tenant-id': tenantId },
      });
      const res = await DELETE(req, {
        params: Promise.resolve({ id: '00000000-0000-0000-0000-000000000001' }),
      });
      expect(res.status).toBe(429);
    });

    it('should call logAuditEvent on successful DELETE', async () => {
      const keyId = '00000000-0000-0000-0000-000000000001';
      vi.mocked(requireAdminAccess).mockResolvedValue(null);
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 10,
        resetAt: new Date(),
      });
      const req = new Request(`http://localhost/api/v1/keys/${keyId}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': tenantId },
      });
      await DELETE(req, {
        params: Promise.resolve({ id: keyId }),
      });
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'REVOKE_KEY',
          resource: `/api/v1/keys/${keyId}`,
          metadata: expect.objectContaining({ tenant_id: tenantId, key_id: keyId }),
        })
      );
    });
  });
});
