import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { POST } from '../route';
import * as serviceMod from '../../../../../../../../lib/services/tenant-modules.service';
import * as provisioningMod from '../../../../../../../../lib/tenant-modules/provisioning';

vi.mock('../../../../../../../../lib/services/tenant-modules.service', () => ({
  getMissingDependencies: vi.fn(),
  getTenantModuleRow: vi.fn(),
  resolveActiveTenantSlug: vi.fn(),
  upsertTenantModuleStatus: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../../../../../../../lib/tenant-modules/provisioning', () => ({
  runModuleProvisioning: vi.fn().mockResolvedValue(undefined),
}));

const ADMIN = 'test-admin-token-for-activate-route';

// n8n is the automatable module (bootstrap_script: null in the catalog).
function ctx(
  moduleId = 'n8n',
  slug = 'peskids'
): { params: Promise<{ slug: string; moduleId: string }> } {
  return { params: Promise.resolve({ slug, moduleId }) };
}

function post(url = 'http://local/api/tenants/peskids/modules/n8n/activate'): Request {
  return new Request(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${ADMIN}` },
  });
}

describe('POST /api/tenants/[slug]/modules/[moduleId]/activate', () => {
  beforeAll(() => {
    process.env.PLATFORM_ADMIN_TOKEN = ADMIN;
  });
  afterAll(() => {
    delete process.env.PLATFORM_ADMIN_TOKEN;
  });
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(serviceMod.resolveActiveTenantSlug).mockResolvedValue('peskids');
    vi.mocked(serviceMod.getMissingDependencies).mockResolvedValue([]);
    vi.mocked(serviceMod.getTenantModuleRow).mockResolvedValue(null);
    vi.mocked(serviceMod.upsertTenantModuleStatus).mockResolvedValue(undefined);
  });

  it('returns 401 without Authorization', async () => {
    const req = new Request('http://local/api/tenants/peskids/modules/n8n/activate', {
      method: 'POST',
    });
    const res = await POST(req, ctx());
    expect(res.status).toBe(401);
  });

  it('returns 404 for a module id that is not in the catalog', async () => {
    const res = await POST(post(), ctx('constructor'));
    expect(res.status).toBe(404);
    expect(provisioningMod.runModuleProvisioning).not.toHaveBeenCalled();
    expect(serviceMod.upsertTenantModuleStatus).not.toHaveBeenCalled();
  });

  it('returns 409 and never provisions a module that requires manual setup', async () => {
    const res = await POST(post(), ctx('twenty'));
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string; automatable: boolean };
    expect(body.automatable).toBe(false);
    expect(body.error).toBe('Module requires manual setup');
    expect(serviceMod.upsertTenantModuleStatus).not.toHaveBeenCalled();
    expect(provisioningMod.runModuleProvisioning).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown or soft-deleted tenant', async () => {
    vi.mocked(serviceMod.resolveActiveTenantSlug).mockResolvedValue(null);
    const res = await POST(post(), ctx());
    expect(res.status).toBe(404);
    expect(serviceMod.upsertTenantModuleStatus).not.toHaveBeenCalled();
    expect(provisioningMod.runModuleProvisioning).not.toHaveBeenCalled();
  });

  it('returns 409 with missing dependencies when requires are not met', async () => {
    vi.mocked(serviceMod.getMissingDependencies).mockResolvedValue(['twenty']);
    const res = await POST(
      post('http://local/api/tenants/peskids/modules/wacrm/activate'),
      ctx('n8n')
    );
    expect(res.status).toBe(409);
    const body = (await res.json()) as { missing_dependencies: string[] };
    expect(body.missing_dependencies).toEqual(['twenty']);
    expect(provisioningMod.runModuleProvisioning).not.toHaveBeenCalled();
  });

  it('queues the module and kicks off provisioning without waiting for it', async () => {
    const res = await POST(post(), ctx());
    expect(res.status).toBe(202);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe('queued');
    expect(serviceMod.upsertTenantModuleStatus).toHaveBeenCalledWith('peskids', 'n8n', 'queued');
    expect(provisioningMod.runModuleProvisioning).toHaveBeenCalledWith('peskids', 'n8n');
  });

  it('uses the resolved canonical slug when the ref is a uuid', async () => {
    const uuid = '11111111-2222-4333-8444-555555555555';
    const res = await POST(post(`http://local/api/tenants/${uuid}/modules/n8n/activate`), {
      params: Promise.resolve({ slug: uuid, moduleId: 'n8n' }),
    });
    expect(res.status).toBe(202);
    expect(serviceMod.resolveActiveTenantSlug).toHaveBeenCalledWith(uuid);
    expect(serviceMod.upsertTenantModuleStatus).toHaveBeenCalledWith('peskids', 'n8n', 'queued');
    expect(provisioningMod.runModuleProvisioning).toHaveBeenCalledWith('peskids', 'n8n');
  });

  describe('idempotency / recovery preconditions', () => {
    it('rejects with 409 while a fresh provisioning run is in flight', async () => {
      vi.mocked(serviceMod.getTenantModuleRow).mockResolvedValue({
        status: 'provisioning',
        updated_at: new Date().toISOString(),
      });
      const res = await POST(post(), ctx());
      expect(res.status).toBe(409);
      const body = (await res.json()) as { error: string; reason: string };
      expect(body.reason).toBe('in_progress');
      expect(serviceMod.upsertTenantModuleStatus).not.toHaveBeenCalled();
      expect(provisioningMod.runModuleProvisioning).not.toHaveBeenCalled();
    });

    it('rejects with 409 while a fresh queued row is in flight', async () => {
      vi.mocked(serviceMod.getTenantModuleRow).mockResolvedValue({
        status: 'queued',
        updated_at: new Date().toISOString(),
      });
      const res = await POST(post(), ctx());
      expect(res.status).toBe(409);
      expect(provisioningMod.runModuleProvisioning).not.toHaveBeenCalled();
    });

    it('allows re-activation of a stale provisioning row (recovery after process death)', async () => {
      // n8n estimated_setup_minutes = 30 → stale after 65 min.
      vi.mocked(serviceMod.getTenantModuleRow).mockResolvedValue({
        status: 'provisioning',
        updated_at: new Date(Date.now() - 90 * 60_000).toISOString(),
      });
      const res = await POST(post(), ctx());
      expect(res.status).toBe(202);
      expect(serviceMod.upsertTenantModuleStatus).toHaveBeenCalledWith('peskids', 'n8n', 'queued');
      expect(provisioningMod.runModuleProvisioning).toHaveBeenCalledWith('peskids', 'n8n');
    });

    it('rejects with 409 when the module is already active', async () => {
      vi.mocked(serviceMod.getTenantModuleRow).mockResolvedValue({
        status: 'active',
        updated_at: new Date().toISOString(),
      });
      const res = await POST(post(), ctx());
      expect(res.status).toBe(409);
      const body = (await res.json()) as { reason: string };
      expect(body.reason).toBe('already_active');
      expect(provisioningMod.runModuleProvisioning).not.toHaveBeenCalled();
    });

    it('allows activation from failed and disabled', async () => {
      for (const status of ['failed', 'disabled'] as const) {
        vi.clearAllMocks();
        vi.mocked(serviceMod.resolveActiveTenantSlug).mockResolvedValue('peskids');
        vi.mocked(serviceMod.getMissingDependencies).mockResolvedValue([]);
        vi.mocked(serviceMod.upsertTenantModuleStatus).mockResolvedValue(undefined);
        vi.mocked(serviceMod.getTenantModuleRow).mockResolvedValue({
          status,
          updated_at: new Date().toISOString(),
        });
        const res = await POST(post(), ctx());
        expect(res.status).toBe(202);
        expect(provisioningMod.runModuleProvisioning).toHaveBeenCalledWith('peskids', 'n8n');
      }
    });
  });
});
