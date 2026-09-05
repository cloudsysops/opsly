import { beforeEach, describe, expect, it, vi } from 'vitest';

const validateStaffRequestMock = vi.fn();
const listPeskidsFranchisesMock = vi.fn();

vi.mock('@/lib/staff-auth', () => ({
  validateStaffRequest: validateStaffRequestMock,
}));

vi.mock('@/lib/services/franchise.service', () => ({
  listPeskidsFranchises: listPeskidsFranchisesMock,
}));

vi.mock('@/lib/franchise/persist', () => ({
  getFranchiseService: vi.fn(),
  resolveFranchiseActor: vi.fn(),
  franchiseErrorResponse: (_requestId: string, err: unknown) => {
    const status =
      typeof err === 'object' && err && 'status' in err ? Number((err as { status: number }).status) : 500;
    return new Response(JSON.stringify({ ok: false, error: 'persist' }), { status });
  },
}));

function request(path: string): Request {
  return new Request(`http://localhost${path}`, { headers: { 'x-request-id': 'req-fos' } });
}

describe('GET /api/admin/franchise-os', () => {
  beforeEach(() => {
    validateStaffRequestMock.mockReset();
    listPeskidsFranchisesMock.mockReset();
  });

  it('rejects unauthenticated requests', async () => {
    validateStaffRequestMock.mockResolvedValue({ ok: false, status: 401, error: 'Unauthorized' });
    const { GET } = await import('../route');
    const res = await GET(request('/api/admin/franchise-os?view=units') as never);
    expect(res.status).toBe(401);
  });

  it('lists mapped operating units for admin', async () => {
    validateStaffRequestMock.mockResolvedValue({
      ok: true,
      method: 'secret',
    });
    listPeskidsFranchisesMock.mockResolvedValue([
      {
        id: 'op-llano',
        tenant_slug: 'peskids',
        slug: 'llanogrande-principal',
        name: 'Sede Llanogrande',
        type: 'flagship',
        status: 'active',
        parent_franchise_id: null,
        is_primary: true,
        created_at: '2026-07-01T00:00:00.000Z',
        updated_at: '2026-07-01T00:00:00.000Z',
      },
    ]);
    const { GET } = await import('../route');
    const res = await GET(request('/api/admin/franchise-os?view=units') as never);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.units[0].code).toBe('llanogrande-principal');
    expect(json.units[0].franchiseeId).toBeNull();
  });

  it('forbids teachers from royalty data', async () => {
    validateStaffRequestMock.mockResolvedValue({
      ok: true,
      method: 'supabase',
      user: { user_metadata: { role: 'teacher', tenant_slug: 'peskids' }, app_metadata: {} },
    });
    const { GET } = await import('../route');
    const res = await GET(request('/api/admin/franchise-os?view=royalties') as never);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/admin/franchises/territories', () => {
  it('rejects unauthenticated requests', async () => {
    validateStaffRequestMock.mockResolvedValue({ ok: false, status: 401, error: 'Unauthorized' });
    const { GET } = await import('../../_franchises/territories/route');
    const res = await GET(request('/api/admin/franchises/territories') as never);
    expect(res.status).toBe(401);
  });
});
