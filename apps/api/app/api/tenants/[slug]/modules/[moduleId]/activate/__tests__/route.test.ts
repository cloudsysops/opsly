import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { POST } from '../route';
import * as serviceMod from '../../../../../../../../lib/services/tenant-modules.service';
import * as provisioningMod from '../../../../../../../../lib/tenant-modules/provisioning';

vi.mock('../../../../../../../../lib/services/tenant-modules.service', () => ({
  getMissingDependencies: vi.fn(),
  upsertTenantModuleStatus: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../../../../../../../lib/tenant-modules/provisioning', () => ({
  runModuleProvisioning: vi.fn().mockResolvedValue(undefined),
}));

const ADMIN = 'test-admin-token-for-activate-route';

function ctx(): { params: Promise<{ slug: string; moduleId: string }> } {
  return { params: Promise.resolve({ slug: 'peskids', moduleId: 'wacrm' }) };
}

describe('POST /api/tenants/[slug]/modules/[moduleId]/activate', () => {
  beforeAll(() => {
    process.env.PLATFORM_ADMIN_TOKEN = ADMIN;
  });
  afterAll(() => {
    delete process.env.PLATFORM_ADMIN_TOKEN;
  });
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without Authorization', async () => {
    const req = new Request('http://local/api/tenants/peskids/modules/wacrm/activate', {
      method: 'POST',
    });
    const res = await POST(req, ctx());
    expect(res.status).toBe(401);
  });

  it('returns 409 with missing dependencies when requires are not met', async () => {
    vi.mocked(serviceMod.getMissingDependencies).mockResolvedValue(['twenty']);
    const req = new Request('http://local/api/tenants/peskids/modules/wacrm/activate', {
      method: 'POST',
      headers: { authorization: `Bearer ${ADMIN}` },
    });
    const res = await POST(req, ctx());
    expect(res.status).toBe(409);
    const body = (await res.json()) as { missing_dependencies: string[] };
    expect(body.missing_dependencies).toEqual(['twenty']);
    expect(provisioningMod.runModuleProvisioning).not.toHaveBeenCalled();
  });

  it('queues the module and kicks off provisioning without waiting for it', async () => {
    vi.mocked(serviceMod.getMissingDependencies).mockResolvedValue([]);
    const req = new Request('http://local/api/tenants/peskids/modules/wacrm/activate', {
      method: 'POST',
      headers: { authorization: `Bearer ${ADMIN}` },
    });
    const res = await POST(req, ctx());
    expect(res.status).toBe(202);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe('queued');
    expect(serviceMod.upsertTenantModuleStatus).toHaveBeenCalledWith('peskids', 'wacrm', 'queued');
    expect(provisioningMod.runModuleProvisioning).toHaveBeenCalledWith('peskids', 'wacrm');
  });
});
