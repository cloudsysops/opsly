import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../route';

vi.mock('../../../../../../lib/auth', () => ({
  requireAdminAccess: vi.fn(),
}));

vi.mock('../../../../../../lib/incubation-machine', () => ({
  getIncubationMachineSnapshot: vi.fn(),
}));

import { requireAdminAccess } from '../../../../../../lib/auth';
import { getIncubationMachineSnapshot } from '../../../../../../lib/incubation-machine';

describe('GET /api/admin/mission-control/incubation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdminAccess).mockResolvedValue(null as never);
    vi.mocked(getIncubationMachineSnapshot).mockResolvedValue({
      generated_at: '2026-05-25T00:00:00.000Z',
      selected_tenant_slug: 'peskids',
      selected_tenant: {
        slug: 'peskids',
        name: 'Peskids',
        plan: 'startup',
        owner_email: 'owner@example.com',
        schema_name: 'peskids',
        platform_domain: 'op-sly.com',
        workflows_count: 4,
        status: 'active',
        lifecycle_stage: 'mvp_validation',
        lifecycle_label: 'MVP Validation',
        operational_status: 'healthy',
        extraction_ready: true,
        extraction_reason: 'workflow bundle and operational boundary are in place',
        deployment_readiness: 'ready',
        backup_ready: true,
        ssl_ready: true,
        uptime_ready: true,
        notes: null,
        source: 'config/tenants/peskids.json',
      },
      lifecycle: {
        stages: [],
        current_stage: null,
        next_stage: null,
      },
      summary: 'Peskids is in MVP Validation',
      next_action: 'Open dedicated VPS provisioning review',
      bundle: { name: 'Opsly Incubation Bundle', components: [] },
      steps: [],
      gates: [],
      agent_governance: { total: 1, healthy: 1, degraded: 0, blocked: 0 },
      candidates: [],
    } as never);
  });

  it('returns 403 when admin access is denied', async () => {
    vi.mocked(requireAdminAccess).mockResolvedValue(
      Response.json({ error: 'forbidden' }, { status: 403 }) as never
    );
    const res = await GET(new Request('http://localhost/api/admin/mission-control/incubation'));
    expect(res.status).toBe(403);
  });

  it('returns the incubation machine snapshot', async () => {
    const res = await GET(
      new Request('http://localhost/api/admin/mission-control/incubation?slug=peskids')
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { selected_tenant_slug: string | null; summary: string };
    expect(body.selected_tenant_slug).toBe('peskids');
    expect(body.summary).toContain('Peskids');
  });
});
