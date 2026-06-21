import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { GET, POST } from '../route';
import * as supabaseMod from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));

const SLUG = 'test-tenant';

function params(slug: string): { params: Promise<{ slug: string }> } {
  return { params: Promise.resolve({ slug }) };
}

describe('NotebookLM Authorization', () => {
  beforeAll(() => {
    process.env.PLATFORM_ADMIN_TOKEN = 'test-token';
  });

  afterAll(() => {
    delete process.env.PLATFORM_ADMIN_TOKEN;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/tenants/[slug]/notebooklm', () => {
    it('should return 401 when no auth header is provided', async () => {
      const req = new Request(`http://localhost/api/tenants/${SLUG}/notebooklm`);
      const res = await GET(req as any, params(SLUG));
      expect(res.status).toBe(401);
    });

    it('should return 200 when valid auth header is provided', async () => {
      const tenant = { id: '123', slug: SLUG };
      const chain = {
        from: () => chain,
        select: () => chain,
        eq: () => chain,
        single: () => Promise.resolve({ data: tenant, error: null }),
      };
      vi.mocked(supabaseMod.getServiceClient).mockReturnValue(
        chain as any
      );

      const req = new Request(`http://localhost/api/tenants/${SLUG}/notebooklm`, {
        headers: {
          'Authorization': 'Bearer test-token'
        }
      });
      const res = await GET(req as any, params(SLUG));
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/tenants/[slug]/notebooklm', () => {
    it('should return 401 when no auth header is provided', async () => {
      const req = new Request(`http://localhost/api/tenants/${SLUG}/notebooklm`, {
        method: 'POST',
        body: JSON.stringify({ action: 'sync' }),
      });
      const res = await POST(req as any, params(SLUG));
      expect(res.status).toBe(401);
    });

    it('should return 400 (config null) when valid auth header is provided', async () => {
      const tenant = { id: '123', slug: SLUG };
      const chain = {
        from: () => chain,
        select: () => chain,
        eq: () => chain,
        single: () => Promise.resolve({ data: tenant, error: null }),
      };
      vi.mocked(supabaseMod.getServiceClient).mockReturnValue(
        chain as any
      );

      const req = new Request(`http://localhost/api/tenants/${SLUG}/notebooklm`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'sync' }),
      });
      const res = await POST(req as any, params(SLUG));
      // Returns 400 because getTenantNotebookConfig returns null in the mock/TODO
      expect(res.status).toBe(400);
    });
  });
});
