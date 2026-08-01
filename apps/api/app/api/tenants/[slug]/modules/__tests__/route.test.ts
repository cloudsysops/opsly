import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { GET } from '../route';
import * as serviceMod from '../../../../../../lib/services/tenant-modules.service';

vi.mock('../../../../../../lib/services/tenant-modules.service', () => ({
  listTenantModules: vi.fn(),
}));

const ADMIN = 'test-admin-token-for-modules-route';

describe('GET /api/tenants/[slug]/modules', () => {
  beforeAll(() => {
    process.env.PLATFORM_ADMIN_TOKEN = ADMIN;
  });
  afterAll(() => {
    delete process.env.PLATFORM_ADMIN_TOKEN;
  });
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without Authorization', async () => {
    const req = new Request('http://local/api/tenants/peskids/modules');
    const res = await GET(req, { params: Promise.resolve({ slug: 'peskids' }) });
    expect(res.status).toBe(401);
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
});
