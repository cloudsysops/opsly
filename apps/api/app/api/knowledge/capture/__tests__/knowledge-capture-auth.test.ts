import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/knowledge/capture/route';
import { requireAdminAccess } from '@/lib/auth';
import * as fs from 'node:fs';

vi.mock('@/lib/auth', () => ({
  requireAdminAccess: vi.fn(),
}));

// Mock node:fs and node:fs/promises
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn(),
  access: vi.fn(),
  appendFile: vi.fn(),
  writeFile: vi.fn(),
  readFile: vi.fn(),
}));

describe('Knowledge Capture Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/knowledge/capture', () => {
    it('returns 401/403 if unauthorized', async () => {
      vi.mocked(requireAdminAccess).mockResolvedValue(
        new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
      );

      const req = new NextRequest('http://localhost/api/knowledge/capture');
      const res = await GET(req);

      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: 'Unauthorized' });
      expect(requireAdminAccess).toHaveBeenCalledWith(req);
    });

    it('proceeds if authorized', async () => {
      vi.mocked(requireAdminAccess).mockResolvedValue(null);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      const fsPromises = await import('node:fs/promises');
      vi.mocked(fsPromises.readFile).mockResolvedValue('## Test Insight');

      const req = new NextRequest('http://localhost/api/knowledge/capture');
      const res = await GET(req);

      expect(res.status).toBe(200);
      expect(requireAdminAccess).toHaveBeenCalledWith(req);
    });
  });

  describe('POST /api/knowledge/capture', () => {
    it('returns 401/403 if unauthorized', async () => {
      vi.mocked(requireAdminAccess).mockResolvedValue(
        new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
      );

      const req = new NextRequest('http://localhost/api/knowledge/capture', {
        method: 'POST',
        body: JSON.stringify({ agent: 'test', context: 'test', insight: 'test' }),
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: 'Unauthorized' });
      expect(requireAdminAccess).toHaveBeenCalledWith(req);
    });

    it('proceeds if authorized', async () => {
      vi.mocked(requireAdminAccess).mockResolvedValue(null);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      const fsPromises = await import('node:fs/promises');
      vi.mocked(fsPromises.access).mockResolvedValue(undefined);
      vi.mocked(fsPromises.appendFile).mockResolvedValue(undefined);

      const req = new NextRequest('http://localhost/api/knowledge/capture', {
        method: 'POST',
        body: JSON.stringify({ agent: 'test', context: 'test', insight: 'test' }),
      });

      const res = await POST(req);

      expect(res.status).toBe(201);
      expect(requireAdminAccess).toHaveBeenCalledWith(req);
    });
  });
});
