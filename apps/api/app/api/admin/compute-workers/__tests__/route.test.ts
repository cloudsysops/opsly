import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '../route';

vi.mock('../../../../../lib/auth', () => ({
  requireAdminAccess: vi.fn(),
}));

vi.mock('redis', () => ({
  createClient: vi.fn(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    lLen: vi.fn().mockResolvedValue(0),
  })),
}));

import { requireAdminAccess } from '../../../../../lib/auth';

describe('GET /api/admin/compute-workers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdminAccess).mockResolvedValue(null as never);
  });

  it('returns 403 when admin access is denied', async () => {
    vi.mocked(requireAdminAccess).mockResolvedValue(
      Response.json({ error: 'forbidden' }, { status: 403 }) as never
    );
    const res = await GET(new Request('http://localhost/api/admin/compute-workers'));
    expect(res.status).toBe(403);
  });

  it('returns the capability snapshot when authorized', async () => {
    const res = await GET(
      new Request('http://localhost/api/admin/compute-workers', {
        headers: { Authorization: 'Bearer valid-token' },
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { workers: Array<{ workerId: string }> };
    expect(body.workers[0]?.workerId).toBe('pc-gamer-openclaw-01');
  });
});
