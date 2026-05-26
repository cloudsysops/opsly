import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../route';

vi.mock('../../../../../lib/auth', () => ({
  requireAdminAccess: vi.fn(),
}));

vi.mock('../../../../../lib/platform-foundation', () => ({
  getPlatformAgentRegistry: vi.fn(),
}));

import { requireAdminAccess } from '../../../../../lib/auth';
import { getPlatformAgentRegistry } from '../../../../../lib/platform-foundation';

describe('GET /api/admin/agents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdminAccess).mockResolvedValue(null as never);
    vi.mocked(getPlatformAgentRegistry).mockResolvedValue({
      items: [
        {
          id: 'architect-supervisor',
          name: 'Architect Supervisor',
          role: 'planner',
          tenant_scope: 'global',
          capabilities: ['plan'],
          permissions: ['mission_control.read'],
          enabled: true,
          approval_boundary: 'approval-first',
          health: {
            status: 'healthy',
            connectivity: {
              api_connectivity: 'unknown',
              redis_connectivity: 'unknown',
              llm_gateway_connectivity: 'unknown',
              backup_readiness: 'unknown',
              deployment_readiness: 'ready',
            },
          },
          heartbeat: {
            last_seen_at: null,
            interval_seconds: 60,
            stale_after_seconds: 300,
            source: 'manual',
          },
          model: 'llama3.2:latest',
          fallback_model: 'anthropic/claude-3-5-sonnet',
          url: 'http://localhost:5001',
          specialization: ['architecture'],
        },
      ],
      summary: { total: 1, healthy: 1, degraded: 0, blocked: 0 },
    } as never);
  });

  it('returns 403 when admin access is denied', async () => {
    vi.mocked(requireAdminAccess).mockResolvedValue(
      Response.json({ error: 'forbidden' }, { status: 403 }) as never
    );
    const res = await GET(new Request('http://localhost/api/admin/agents'));
    expect(res.status).toBe(403);
  });

  it('returns the agent registry snapshot', async () => {
    const res = await GET(new Request('http://localhost/api/admin/agents'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { total: number; agents: Array<{ id: string }> };
    expect(body.total).toBe(1);
    expect(body.agents[0]?.id).toBe('architect-supervisor');
  });
});
