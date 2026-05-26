import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../route';

vi.mock('../../../../../../lib/auth', () => ({
  requireAdminAccess: vi.fn(),
}));

vi.mock('../../../../../../lib/platform-foundation', () => ({
  getPlatformTenantRegistry: vi.fn(),
}));

import { requireAdminAccess } from '../../../../../../lib/auth';
import { getPlatformTenantRegistry } from '../../../../../../lib/platform-foundation';

describe('GET /api/admin/tenants/registry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdminAccess).mockResolvedValue(null as never);
    vi.mocked(getPlatformTenantRegistry).mockResolvedValue({
      stages: [],
      items: [
        {
          slug: 'peskids',
          name: 'Peskids',
          plan: 'startup',
          owner_email: 'owner@example.com',
          schema_name: 'peskids',
          platform_domain: 'op-sly.com',
          workflows_count: 4,
          status: 'active',
          lifecycle_stage: 'dedicated_vps',
          lifecycle_label: 'Dedicated VPS',
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
      ],
      by_stage: {
        incubated_tenant: 0,
        mvp_validation: 0,
        operational_stabilization: 0,
        dedicated_vps: 1,
        independent_platform: 0,
        connected_client_platform: 0,
      },
      extraction_ready: 1,
    } as never);
  });

  it('returns 403 when admin access is denied', async () => {
    vi.mocked(requireAdminAccess).mockResolvedValue(
      Response.json({ error: 'forbidden' }, { status: 403 }) as never
    );
    const res = await GET(new Request('http://localhost/api/admin/tenants/registry'));
    expect(res.status).toBe(403);
  });

  it('returns the tenant registry snapshot', async () => {
    const res = await GET(new Request('http://localhost/api/admin/tenants/registry'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { total: number; extraction_ready: number };
    expect(body.total).toBe(1);
    expect(body.extraction_ready).toBe(1);
  });
});
