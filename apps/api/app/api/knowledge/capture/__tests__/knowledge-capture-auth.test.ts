import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../route';
import * as authMod from '../../../../../lib/auth';

vi.mock('../../../../../lib/auth', () => ({
  requireAdminAccess: vi.fn(),
}));

describe('Knowledge Capture Auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const forbiddenResponse = new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  describe('GET /api/knowledge/capture', () => {
    it('should return 401 if unauthorized', async () => {
      vi.mocked(authMod.requireAdminAccess).mockResolvedValue(forbiddenResponse.clone());

      const request = new Request('http://localhost/api/knowledge/capture');
      const response = await GET(request);

      expect(response.status).toBe(401);
      expect(authMod.requireAdminAccess).toHaveBeenCalled();
    });
  });

  describe('POST /api/knowledge/capture', () => {
    it('should return 401 if unauthorized', async () => {
      vi.mocked(authMod.requireAdminAccess).mockResolvedValue(forbiddenResponse.clone());

      const request = new Request('http://localhost/api/knowledge/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: 'test',
          context: 'test',
          insight: 'test'
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
      expect(authMod.requireAdminAccess).toHaveBeenCalled();
    });
  });
});
