import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { POST } from '../route';
import * as serviceMod from '../../../../../../../../lib/services/tenant-modules.service';

vi.mock('../../../../../../../../lib/services/tenant-modules.service', () => ({
  resolveActiveTenantSlug: vi.fn(),
  upsertTenantModuleStatus: vi.fn().mockResolvedValue(undefined),
}));

const ADMIN = 'test-admin-token-for-mark-manual-steps-route';

function ctx(
  moduleId = 'twenty',
  slug = 'peskids'
): { params: Promise<{ slug: string; moduleId: string }> } {
  return { params: Promise.resolve({ slug, moduleId }) };
}

function post(auth = true): Request {
  return new Request('http://local/api/tenants/peskids/modules/twenty/mark-manual-steps-done', {
    method: 'POST',
    ...(auth ? { headers: { authorization: `Bearer ${ADMIN}` } } : {}),
  });
}

describe('POST /api/tenants/[slug]/modules/[moduleId]/mark-manual-steps-done', () => {
  beforeAll(() => {
    process.env.PLATFORM_ADMIN_TOKEN = ADMIN;
  });
  afterAll(() => {
    delete process.env.PLATFORM_ADMIN_TOKEN;
  });
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(serviceMod.resolveActiveTenantSlug).mockResolvedValue('peskids');
    vi.mocked(serviceMod.upsertTenantModuleStatus).mockResolvedValue(undefined);
  });

  it('returns 401 without Authorization', async () => {
    const res = await POST(post(false), ctx());
    expect(res.status).toBe(401);
    expect(serviceMod.upsertTenantModuleStatus).not.toHaveBeenCalled();
  });

  it('returns 404 for a module id that is not in the catalog', async () => {
    for (const moduleId of ['not-a-real-module', 'constructor']) {
      vi.clearAllMocks();
      vi.mocked(serviceMod.resolveActiveTenantSlug).mockResolvedValue('peskids');
      const res = await POST(post(), ctx(moduleId));
      expect(res.status).toBe(404);
      expect(serviceMod.upsertTenantModuleStatus).not.toHaveBeenCalled();
    }
  });

  it('returns 404 for an unknown or soft-deleted tenant', async () => {
    vi.mocked(serviceMod.resolveActiveTenantSlug).mockResolvedValue(null);
    const res = await POST(post(), ctx());
    expect(res.status).toBe(404);
    expect(serviceMod.upsertTenantModuleStatus).not.toHaveBeenCalled();
  });

  it('marks the module active for a known module and tenant', async () => {
    const res = await POST(post(), ctx());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe('active');
    expect(serviceMod.upsertTenantModuleStatus).toHaveBeenCalledWith('peskids', 'twenty', 'active');
  });

  it('writes against the resolved canonical slug for a uuid ref', async () => {
    const uuid = '11111111-2222-4333-8444-555555555555';
    const res = await POST(post(), ctx('twenty', uuid));
    expect(res.status).toBe(200);
    expect(serviceMod.resolveActiveTenantSlug).toHaveBeenCalledWith(uuid);
    expect(serviceMod.upsertTenantModuleStatus).toHaveBeenCalledWith('peskids', 'twenty', 'active');
  });
});
