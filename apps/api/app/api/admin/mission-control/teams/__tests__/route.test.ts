import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../route';

vi.mock('../../../../../../lib/auth', () => ({
  requireAdminAccess: vi.fn(),
}));

vi.mock('../../../../../../lib/supabase', () => ({
  getServiceClient: vi.fn(() => ({
    schema: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
  })),
}));

import { requireAdminAccess } from '../../../../../../lib/auth';

describe('GET /api/admin/mission-control/teams', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdminAccess).mockResolvedValue(null as never);
  });

  it('returns 403 when admin access is denied', async () => {
    vi.mocked(requireAdminAccess).mockResolvedValue(
      Response.json({ error: 'forbidden' }, { status: 403 }) as never
    );
    const res = await GET(new Request('http://localhost/api/admin/mission-control/teams'));
    expect(res.status).toBe(403);
  });

  it('returns 200 when authorized', async () => {
    const res = await GET(
      new Request('http://localhost/api/admin/mission-control/teams', {
        headers: { Authorization: 'Bearer valid-token' },
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('teams');
    expect(body).toHaveProperty('generated_at');
  });
});
