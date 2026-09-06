import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const validateStaffRequestMock = vi.fn();

vi.mock('@/lib/staff-auth', () => ({
  validateStaffRequest: validateStaffRequestMock,
}));

vi.mock('@/lib/franchise/persist', () => ({
  getFranchiseService: vi.fn(),
  resolveFranchiseActor: vi.fn(),
  franchiseErrorResponse: (_requestId: string, err: unknown) => {
    const status =
      typeof err === 'object' && err && 'status' in err
        ? Number((err as { status: number }).status)
        : 500;
    return new Response(JSON.stringify({ ok: false, error: 'persist' }), { status });
  },
}));

function request(path: string): Request {
  return new Request(`http://localhost${path}`, { headers: { 'x-request-id': 'req-fos' } });
}

/**
 * The in-app Franchise OS aggregate was removed (it now lives in the standalone
 * apps/peskids-franchise app). The route must still authenticate first, and then
 * refuse — an unfinished module stays closed even though the UI no longer links
 * to it.
 */
describe('GET /api/admin/franchise-os', () => {
  beforeEach(() => {
    validateStaffRequestMock.mockReset();
    vi.stubEnv('PESKIDS_APP_ENV', 'production');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('rejects unauthenticated requests before revealing module state', async () => {
    validateStaffRequestMock.mockResolvedValue({ ok: false, status: 401, error: 'Unauthorized' });
    const { GET } = await import('../route');
    const res = await GET(request('/api/admin/franchise-os?view=units') as never);
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toMatchObject({
      ok: false,
      code: 'UNAUTHORIZED',
      request_id: 'req-fos',
    });
  });

  it('refuses an authenticated tenant owner with MODULE_DISABLED in production', async () => {
    validateStaffRequestMock.mockResolvedValue({ ok: true, method: 'secret' });
    const { GET } = await import('../route');
    const res = await GET(request('/api/admin/franchise-os?view=units') as never);
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({ ok: false, code: 'MODULE_DISABLED' });
  });

  it('stays refused in production even when only the feature flag is on', async () => {
    vi.stubEnv('PESKIDS_FRANCHISE_OS_ENABLED', 'true');
    validateStaffRequestMock.mockResolvedValue({ ok: true, method: 'secret' });
    const { GET } = await import('../route');
    const res = await GET(request('/api/admin/franchise-os?view=royalties') as never);
    expect(res.status).toBe(503);
  });

  it('refuses writes for the same reason', async () => {
    validateStaffRequestMock.mockResolvedValue({ ok: true, method: 'secret' });
    const { POST } = await import('../route');
    const res = await POST(
      new Request('http://localhost/api/admin/franchise-os', {
        method: 'POST',
        headers: { 'x-request-id': 'req-fos' },
        body: JSON.stringify({ action: 'inspect_royalty' }),
      }) as never
    );
    expect(res.status).toBe(503);
  });

  it('reports the module as moved once the gate is opened', async () => {
    vi.stubEnv('PESKIDS_APP_ENV', 'staging');
    vi.stubEnv('PESKIDS_FRANCHISE_OS_ENABLED', 'true');
    validateStaffRequestMock.mockResolvedValue({ ok: true, method: 'secret' });
    const { GET } = await import('../route');
    const res = await GET(request('/api/admin/franchise-os?view=units') as never);
    expect(res.status).toBe(410);
    await expect(res.json()).resolves.toMatchObject({ ok: false, code: 'MODULE_MOVED' });
  });
});

describe('GET /api/admin/franchises/territories', () => {
  beforeEach(() => {
    validateStaffRequestMock.mockReset();
  });

  it('rejects unauthenticated requests', async () => {
    validateStaffRequestMock.mockResolvedValue({ ok: false, status: 401, error: 'Unauthorized' });
    const { GET } = await import('../../franchises/_territories/route');
    const res = await GET(request('/api/admin/franchises/territories') as never);
    expect(res.status).toBe(401);
  });
});
