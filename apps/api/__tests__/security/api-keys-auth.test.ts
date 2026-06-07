import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../../app/api/v1/keys/route';
import { DELETE } from '../../app/api/v1/keys/[id]/route';
import * as supabaseMod from '../../lib/supabase';

vi.mock('../../lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));

// Mocking resolveSuperAdminSession to control its output
vi.mock('../../lib/super-admin-auth', () => ({
  resolveSuperAdminSession: vi.fn(() => Promise.resolve({ ok: false, response: new Response('Unauthorized', { status: 401 }) })),
}));

describe('API Keys Security (Authorization)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PLATFORM_ADMIN_TOKEN = 'admin-secret-token';
  });

  describe('GET /api/v1/keys', () => {
    it('should return 401 if no authorization is provided', async () => {
      const req = new Request('http://localhost/api/v1/keys', {
        headers: { 'x-tenant-id': '00000000-0000-0000-0000-000000000000' }
      });
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it('should return 200 if valid x-admin-token is provided', async () => {
      // Mock supabase to return empty list
      const from = vi.fn().mockReturnValue({
        select: () => ({
          eq: () => ({
            is: () => ({
              order: async () => ({ data: [], error: null })
            })
          })
        })
      });
      vi.mocked(supabaseMod.getServiceClient).mockReturnValue({
        schema: () => ({ from })
      } as never);

      const req = new Request('http://localhost/api/v1/keys', {
        headers: {
          'x-tenant-id': '00000000-0000-0000-0000-000000000000',
          'x-admin-token': 'admin-secret-token'
        }
      });
      const res = await GET(req);
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/v1/keys', () => {
    it('should return 401 if no authorization is provided', async () => {
      const req = new Request('http://localhost/api/v1/keys', {
        method: 'POST',
        headers: {
          'x-tenant-id': '00000000-0000-0000-0000-000000000000',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: 'New Key' })
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/v1/keys/[id]', () => {
    it('should return 401 if no authorization is provided', async () => {
      const req = new Request('http://localhost/api/v1/keys/uuid-key', {
        method: 'DELETE',
        headers: { 'x-tenant-id': '00000000-0000-0000-0000-000000000000' }
      });
      const res = await DELETE(req, { params: Promise.resolve({ id: '00000000-0000-0000-0000-000000000001' }) });
      expect(res.status).toBe(401);
    });
  });
});
