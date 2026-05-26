import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../route';

vi.mock('../../../../../lib/auth', () => ({
  requireAdminAccess: vi.fn(),
}));

vi.mock('../../../../../lib/platform-foundation', () => ({
  getMissionControlFoundationReadModel: vi.fn(),
}));

import { requireAdminAccess } from '../../../../../lib/auth';
import { getMissionControlFoundationReadModel } from '../../../../../lib/platform-foundation';

describe('GET /api/admin/mission-control', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdminAccess).mockResolvedValue(null as never);
    vi.mocked(getMissionControlFoundationReadModel).mockResolvedValue({
      generated_at: '2026-05-25T00:00:00.000Z',
      vps: {
        host: 'vps-dragon',
        status: 'healthy',
        api_connectivity: 'up',
        orchestrator_connectivity: 'up',
        llm_gateway_connectivity: 'up',
        redis_connectivity: 'up',
      },
      tenants: { total: 1, by_stage: {}, extraction_ready: 1, items: [] },
      backups: {
        status: 'ready',
        policy: 'cron=0 2 * * * retention=30d',
        ready_tenants: 1,
        last_success_at: null,
      },
      ssl: { status: 'ready', wildcard_domain: '*.op-sly.com', ready_tenants: 1 },
      workflows: { status: 'ready', total: 4, bootstrap_ready: 1 },
      uptime: { status: 'ready', services: [] },
      ai_agents: { total: 1, healthy: 1, degraded: 0, blocked: 0, items: [] },
      pending_approvals: { count: 0, queues: [] },
      extraction_readiness: { ready: 1, blocked: 0, items: [] },
      openclaw: {
        intents: [],
        intents_in_progress: [],
        recent_policy_violations: [],
        agent_metrics: {},
        generated_at: '2026-05-25T00:00:00.000Z',
      },
    } as never);
  });

  it('returns 403 when admin access is denied', async () => {
    vi.mocked(requireAdminAccess).mockResolvedValue(
      Response.json({ error: 'forbidden' }, { status: 403 }) as never
    );
    const res = await GET(new Request('http://localhost/api/admin/mission-control'));
    expect(res.status).toBe(403);
  });

  it('returns the mission control foundation snapshot', async () => {
    const res = await GET(
      new Request('http://localhost/api/admin/mission-control', {
        headers: { Authorization: 'Bearer token' },
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { vps: { status: string }; tenants: { total: number } };
    expect(body.vps.status).toBe('healthy');
    expect(body.tenants.total).toBe(1);
  });
});
