import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../route';

vi.mock('../../../../../../lib/auth', () => ({
  requireAdminAccess: vi.fn(),
}));

vi.mock('redis', () => ({
  createClient: vi.fn(() => ({
    on: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    lLen: vi.fn().mockResolvedValue(0),
  })),
}));

import { requireAdminAccess } from '../../../../../../lib/auth';

describe('GET /api/admin/mission-control/orchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdminAccess).mockResolvedValue(null as never);
  });

  it('returns 403 when admin access is denied', async () => {
    vi.mocked(requireAdminAccess).mockResolvedValue(
      Response.json({ error: 'forbidden' }, { status: 403 }) as never
    );
    const res = await GET(new Request('http://localhost/api/admin/mission-control/orchestrator'));
    expect(res.status).toBe(403);
  });

  it('returns 200 when authorized', async () => {
    const res = await GET(
      new Request('http://localhost/api/admin/mission-control/orchestrator', {
        headers: { Authorization: 'Bearer valid-token' },
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('queue');
    expect(body).toHaveProperty('workers');
  });
});
