import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { GET, POST } from '../route';
import { DELETE } from '../[moduleId]/route';
import * as supabaseMod from '../../../../../../lib/supabase';
import * as entitlementsMod from '@intcloudsysops/services/entitlements';

vi.mock('../../../../../../lib/supabase', () => ({
  getServiceClient: vi.fn(() => ({})),
}));

vi.mock('@intcloudsysops/services/entitlements', async () => {
  const actual = await vi.importActual<typeof entitlementsMod>(
    '@intcloudsysops/services/entitlements'
  );
  return {
    ...actual,
    listEntitlements: vi.fn(),
    grantEntitlement: vi.fn(),
    revokeEntitlement: vi.fn(),
  };
});

// Fixed module-id set rather than the real config/commercial-catalog.json —
// an unrelated catalog edit shouldn't be able to break these route tests.
vi.mock('../../../../../../lib/commercial-catalog', () => ({
  getCommercialCatalogModuleIds: () => new Set(['simple-crm']),
}));

const ADMIN = 'test-admin-token-for-entitlements-route';

function authHeaders(): HeadersInit {
  return { authorization: `Bearer ${ADMIN}` };
}

function params(slug: string, moduleId?: string) {
  return { params: Promise.resolve(moduleId ? { slug, moduleId } : { slug }) };
}

beforeAll(() => {
  process.env.PLATFORM_ADMIN_TOKEN = ADMIN;
});
afterAll(() => {
  delete process.env.PLATFORM_ADMIN_TOKEN;
});
beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/tenants/[slug]/entitlements', () => {
  it('returns 401 without Authorization', async () => {
    const req = new Request('http://local/api/tenants/swim-cali/entitlements');
    const res = await GET(req, params('swim-cali'));
    expect(res.status).toBe(401);
  });

  it('returns 404 when the tenant does not exist', async () => {
    vi.mocked(entitlementsMod.listEntitlements).mockRejectedValue(
      new entitlementsMod.TenantNotFoundError('ghost-tenant')
    );
    const req = new Request('http://local/api/tenants/ghost-tenant/entitlements', {
      headers: authHeaders(),
    });
    const res = await GET(req, params('ghost-tenant'));
    expect(res.status).toBe(404);
  });

  it('returns 400 for a malformed slug instead of hitting the DB', async () => {
    const req = new Request('http://local/api/tenants/Not_A_Slug!/entitlements', {
      headers: authHeaders(),
    });
    const res = await GET(req, params('Not_A_Slug!'));
    expect(res.status).toBe(400);
    expect(entitlementsMod.listEntitlements).not.toHaveBeenCalled();
  });

  it('returns the entitlement list on success', async () => {
    const rows = [{ id: 'e1', module_id: 'simple-crm', enabled: true }];
    vi.mocked(entitlementsMod.listEntitlements).mockResolvedValue(
      rows as unknown as Awaited<ReturnType<typeof entitlementsMod.listEntitlements>>
    );
    const req = new Request('http://local/api/tenants/swim-cali/entitlements', {
      headers: authHeaders(),
    });
    const res = await GET(req, params('swim-cali'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown };
    expect(body.data).toEqual(rows);
  });
});

describe('POST /api/tenants/[slug]/entitlements', () => {
  it('returns 400 for an invalid module_id', async () => {
    const req = new Request('http://local/api/tenants/swim-cali/entitlements', {
      method: 'POST',
      headers: { ...authHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify({ module_id: 'Not_Valid' }),
    });
    const res = await POST(req, params('swim-cali'));
    expect(res.status).toBe(400);
  });

  it('returns 400 for a well-formed module_id that is not in the commercial catalog', async () => {
    const req = new Request('http://local/api/tenants/swim-cali/entitlements', {
      method: 'POST',
      headers: { ...authHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify({ module_id: 'not-a-real-module' }),
    });
    const res = await POST(req, params('swim-cali'));
    expect(res.status).toBe(400);
    expect(entitlementsMod.grantEntitlement).not.toHaveBeenCalled();
  });

  it('returns 400 for a malformed slug instead of hitting the DB', async () => {
    const req = new Request('http://local/api/tenants/Not_A_Slug!/entitlements', {
      method: 'POST',
      headers: { ...authHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify({ module_id: 'simple-crm' }),
    });
    const res = await POST(req, params('Not_A_Slug!'));
    expect(res.status).toBe(400);
    expect(entitlementsMod.grantEntitlement).not.toHaveBeenCalled();
  });

  it('grants the entitlement and returns 201', async () => {
    const granted = { id: 'e1', module_id: 'simple-crm', enabled: true, source: 'manual' };
    vi.mocked(entitlementsMod.grantEntitlement).mockResolvedValue(
      granted as unknown as Awaited<ReturnType<typeof entitlementsMod.grantEntitlement>>
    );
    const req = new Request('http://local/api/tenants/swim-cali/entitlements', {
      method: 'POST',
      headers: { ...authHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify({ module_id: 'simple-crm' }),
    });
    const res = await POST(req, params('swim-cali'));
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: unknown };
    expect(body.data).toEqual(granted);
  });
});

describe('DELETE /api/tenants/[slug]/entitlements/[moduleId]', () => {
  it('returns 401 without Authorization', async () => {
    const req = new Request('http://local/api/tenants/swim-cali/entitlements/simple-crm', {
      method: 'DELETE',
    });
    const res = await DELETE(req, params('swim-cali', 'simple-crm'));
    expect(res.status).toBe(401);
  });

  it('returns 204 on successful revoke', async () => {
    vi.mocked(entitlementsMod.revokeEntitlement).mockResolvedValue(undefined);
    const req = new Request('http://local/api/tenants/swim-cali/entitlements/simple-crm', {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const res = await DELETE(req, params('swim-cali', 'simple-crm'));
    expect(res.status).toBe(204);
  });

  it('returns 404 when the tenant does not exist', async () => {
    vi.mocked(entitlementsMod.revokeEntitlement).mockRejectedValue(
      new entitlementsMod.TenantNotFoundError('ghost-tenant')
    );
    const req = new Request('http://local/api/tenants/ghost-tenant/entitlements/simple-crm', {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const res = await DELETE(req, params('ghost-tenant', 'simple-crm'));
    expect(res.status).toBe(404);
  });

  it('returns 400 for a malformed slug instead of a silent no-op delete', async () => {
    const req = new Request('http://local/api/tenants/Not_A_Slug!/entitlements/simple-crm', {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const res = await DELETE(req, params('Not_A_Slug!', 'simple-crm'));
    expect(res.status).toBe(400);
    expect(entitlementsMod.revokeEntitlement).not.toHaveBeenCalled();
  });

  it('returns 400 for a malformed moduleId instead of a silent no-op delete', async () => {
    const req = new Request('http://local/api/tenants/swim-cali/entitlements/Not_Valid!', {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const res = await DELETE(req, params('swim-cali', 'Not_Valid!'));
    expect(res.status).toBe(400);
    expect(entitlementsMod.revokeEntitlement).not.toHaveBeenCalled();
  });
});
