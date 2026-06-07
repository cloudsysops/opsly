import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET } from '../route';
import * as auth from '@/lib/auth';

vi.mock('@/lib/auth', () => ({
  requireAdminAccess: vi.fn(),
}));

describe('Knowledge Capture API Authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/knowledge/capture', () => {
    it('should return 401 if unauthorized', async () => {
      vi.mocked(auth.requireAdminAccess).mockResolvedValue(
        new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
      );

      const req = new NextRequest('http://localhost/api/knowledge/capture', {
        method: 'POST',
        body: JSON.stringify({
          agent: 'test-agent',
          context: 'test-context',
          insight: 'test-insight',
        }),
      });

      const response = await POST(req);
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });
  });

  describe('GET /api/knowledge/capture', () => {
    it('should return 401 if unauthorized', async () => {
      vi.mocked(auth.requireAdminAccess).mockResolvedValue(
        new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
      );

      const req = new NextRequest('http://localhost/api/knowledge/capture', {
        method: 'GET',
      });

      const response = await GET(req);
      expect(response.status).toBe(401);
    });
  });
});
