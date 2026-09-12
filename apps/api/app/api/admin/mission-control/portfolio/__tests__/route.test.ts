import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../route';

vi.mock('../../../../../../lib/auth', () => ({
  requireAdminAccess: vi.fn(),
}));

import { requireAdminAccess } from '../../../../../../lib/auth';

describe('GET /api/admin/mission-control/portfolio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdminAccess).mockResolvedValue(null as never);
  });

  it('rejects non-admin access', async () => {
    vi.mocked(requireAdminAccess).mockResolvedValue(
      Response.json({ error: 'forbidden' }, { status: 403 }) as never
    );
    const res = await GET(new Request('http://localhost/api/admin/mission-control/portfolio'));
    expect(res.status).toBe(403);
  });

  it('returns founder-agent portfolio with WIP summary', async () => {
    const res = await GET(
      new Request('http://localhost/api/admin/mission-control/portfolio', {
        headers: { Authorization: 'Bearer test' },
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      operating_model: string;
      summary: { wip_limit: number };
      workstreams: unknown[];
    };
    expect(body.operating_model).toBe('solo-founder-agent-agile');
    expect(body.summary.wip_limit).toBe(4);
    expect(body.workstreams.length).toBeGreaterThan(0);
  });
});
