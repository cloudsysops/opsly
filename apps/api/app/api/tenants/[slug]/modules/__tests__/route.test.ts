import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { GET } from '../route';
import * as serviceMod from '../../../../../../lib/services/tenant-modules.service';

vi.mock('../../../../../../lib/services/tenant-modules.service', () => ({
  listTenantModules: vi.fn(),
  resolveActiveTenantSlug: vi.fn(),
}));

const ADMIN = 'test-admin-token-for-modules-route';

describe('GET /api/tenants/[slug]/modules', () => {
  beforeAll(() => {
    process.env.PLATFORM_ADMIN_TOKEN = ADMIN;
  });
  afterAll(() => {
    delete process.env.PLATFORM_ADMIN_TOKEN;
    delete process.env.ADMIN_PUBLIC_DEMO_READ;
  });
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ADMIN_PUBLIC_DEMO_READ;
    vi.mocked(serviceMod.resolveActiveTenantSlug).mockResolvedValue('peskids');
  });

  it('returns 401 without Authorization', async () => {
    const req = new Request('http://local/api/tenants/peskids/modules');
    const res = await GET(req, { params: Promise.resolve({ slug: 'peskids' }) });
    expect(res.status).toBe(401);
  });

  it('still requires auth when ADMIN_PUBLIC_DEMO_READ=true (no demo-read bypass)', async () => {
    process.env.ADMIN_PUBLIC_DEMO_READ = 'true';
    const req = new Request('http://local/api/tenants/peskids/modules');
    const res = await GET(req, { params: Promise.resolve({ slug: 'peskids' }) });
    expect(res.status).toBe(401);
    expect(serviceMod.listTenantModules).not.toHaveBeenCalled();
  });

  it('returns the module list when authorized', async () => {
    vi.mocked(serviceMod.listTenantModules).mockResolvedValue([]);
    const req = new Request('http://local/api/tenants/peskids/modules', {
      headers: { authorization: `Bearer ${ADMIN}` },
    });
    const res = await GET(req, { params: Promise.resolve({ slug: 'peskids' }) });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { modules: unknown[] };
    expect(body.modules).toEqual([]);
  });

  it('resolves a uuid ref and queries modules with the canonical slug', async () => {
    const uuid = '11111111-2222-4333-8444-555555555555';
    vi.mocked(serviceMod.listTenantModules).mockResolvedValue([]);
    const req = new Request(`http://local/api/tenants/${uuid}/modules`, {
      headers: { authorization: `Bearer ${ADMIN}` },
    });
    const res = await GET(req, { params: Promise.resolve({ slug: uuid }) });
    expect(res.status).toBe(200);
    expect(serviceMod.resolveActiveTenantSlug).toHaveBeenCalledWith(uuid);
    expect(serviceMod.listTenantModules).toHaveBeenCalledWith('peskids');
  });

  it('returns 404 for an unknown or soft-deleted tenant', async () => {
    vi.mocked(serviceMod.resolveActiveTenantSlug).mockResolvedValue(null);
    const req = new Request('http://local/api/tenants/gone/modules', {
      headers: { authorization: `Bearer ${ADMIN}` },
    });
    const res = await GET(req, { params: Promise.resolve({ slug: 'gone' }) });
    expect(res.status).toBe(404);
    expect(serviceMod.listTenantModules).not.toHaveBeenCalled();
  });

  it('does not expose script command strings in the payload', async () => {
    // Shape returned by the real service projection (see
    // lib/services/__tests__/tenant-modules.service.test.ts for the
    // "never leaks bootstrap_script/smoke_script" assertion on real data).
    vi.mocked(serviceMod.listTenantModules).mockResolvedValue([
      {
        id: 'twenty',
        name: 'Twenty CRM',
        description: 'crm',
        category: 'crm',
        tier: 'starter',
        required_by: [],
        requires: [],
        manual_steps: [],
        estimated_setup_minutes: 20,
        cost_level: 'low',
        automatable: false,
        status: 'not_installed',
        last_error: null,
        updated_at: null,
      },
    ]);
    const req = new Request('http://local/api/tenants/peskids/modules', {
      headers: { authorization: `Bearer ${ADMIN}` },
    });
    const res = await GET(req, { params: Promise.resolve({ slug: 'peskids' }) });
    const raw = await res.text();
    expect(raw).not.toContain('bootstrap_script');
    expect(raw).not.toContain('smoke_script');
    expect(raw).toContain('"automatable":false');
  });
});
