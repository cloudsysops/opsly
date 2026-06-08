import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DELETE } from '../route';
import * as authMod from '../../../../../../lib/auth';
import * as supabaseMod from '../../../../../../lib/supabase';

vi.mock('../../../../../../lib/auth', () => ({
  requireAdminAccess: vi.fn(),
}));

vi.mock('../../../../../../lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));

describe('API Keys [id] Auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const forbiddenResponse = new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  describe('DELETE /api/v1/keys/[id]', () => {
    it('should return 401 if unauthorized', async () => {
      vi.mocked(authMod.requireAdminAccess).mockResolvedValue(forbiddenResponse.clone());

      const request = new Request('http://localhost/api/v1/keys/123', {
        method: 'DELETE',
        headers: { 'x-tenant-id': '00000000-0000-0000-0000-000000000000' },
      });

      const response = await DELETE(request, {
        params: Promise.resolve({ id: '00000000-0000-0000-0000-000000000000' })
      });

      expect(response.status).toBe(401);
      expect(authMod.requireAdminAccess).toHaveBeenCalled();
    });
  });
});
