import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GET, POST } from '../route';
import { requireAdminAccess } from '@/lib/auth';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  requireAdminAccess: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  getServiceClient: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { slug: 'test-tenant' }, error: null }),
  })),
}));

describe('NotebookLM V1 Security Auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const params = Promise.resolve({ ref: 'test-tenant' });

  describe('GET /api/v1/tenants/[ref]/notebooklm', () => {
    it('should return 401 when admin access is denied', async () => {
      vi.mocked(requireAdminAccess).mockResolvedValue(
        Response.json({ error: 'Unauthorized' }, { status: 401 }) as never
      );
      const req = new NextRequest('http://localhost/api/v1/tenants/test-tenant/notebooklm');
      const res = await GET(req, { params });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/tenants/[ref]/notebooklm', () => {
    it('should return 403 when admin access is forbidden', async () => {
      vi.mocked(requireAdminAccess).mockResolvedValue(
        Response.json({ error: 'Forbidden' }, { status: 403 }) as never
      );
      const req = new NextRequest('http://localhost/api/v1/tenants/test-tenant/notebooklm', {
        method: 'POST',
        body: JSON.stringify({ action: 'sync' }),
      });
      const res = await POST(req, { params });
      expect(res.status).toBe(403);
    });
  });
});
