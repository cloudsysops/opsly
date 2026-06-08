import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../route';
import * as authMod from '../../../../../lib/auth';
import * as supabaseMod from '../../../../../lib/supabase';

vi.mock('../../../../../lib/auth', () => ({
  requireAdminAccess: vi.fn(),
}));

vi.mock('../../../../../lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));

describe('API Keys Auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const forbiddenResponse = new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  describe('GET /api/v1/keys', () => {
    it('should return 401 if unauthorized', async () => {
      vi.mocked(authMod.requireAdminAccess).mockResolvedValue(forbiddenResponse.clone());

      const request = new Request('http://localhost/api/v1/keys', {
        headers: { 'x-tenant-id': '00000000-0000-0000-0000-000000000000' },
      });
      const response = await GET(request);

      expect(response.status).toBe(401);
      expect(authMod.requireAdminAccess).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/keys', () => {
    it('should return 401 if unauthorized', async () => {
      vi.mocked(authMod.requireAdminAccess).mockResolvedValue(forbiddenResponse.clone());

      const request = new Request('http://localhost/api/v1/keys', {
        method: 'POST',
        headers: {
          'x-tenant-id': '00000000-0000-0000-0000-000000000000',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'test-key' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
      expect(authMod.requireAdminAccess).toHaveBeenCalled();
    });
  });
});
