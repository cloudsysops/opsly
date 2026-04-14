import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { GET, PATCH, DELETE } from '../route';
import * as supabaseMod from '../../../../../lib/supabase';
import * as orchestratorMod from '../../../../../lib/orchestrator';
import * as dockerMod from '../../../../../lib/docker';

vi.mock('../../../../../lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));

vi.mock('../../../../../lib/orchestrator', () => ({
  deleteTenant: vi.fn(),
}));

vi.mock('../../../../../lib/docker', () => ({
  getTenantStackStatus: vi.fn(),
}));

const ADMIN = 'test-admin-token-tenant-id';
const UUID = '550e8400-e29b-41d4-a716-446655440000';

function authHeaders(): HeadersInit {
  return { authorization: `Bearer ${ADMIN}` };
}

function params(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/tenants/:id', () => {
  beforeAll(() => {
    process.env.PLATFORM_ADMIN_TOKEN = ADMIN;
  });
  afterAll(() => {
    delete process.env.PLATFORM_ADMIN_TOKEN;
  });
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 for invalid ref', async () => {
    const chainStub = {} as ReturnType<typeof supabaseMod.getServiceClient>;
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(chainStub);
    const res = await GET(new Request('http://local/x', { headers: authHeaders() }), params('$$$'));
    expect(res.status).toBe(400);
  });

  it('returns 404 when tenant missing', async () => {
    const chain = {
      schema: () => chain,
      from: () => chain,
      select: () => chain,
      is: () => chain,
      eq: () => chain,
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
    };
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(
      chain as ReturnType<typeof supabaseMod.getServiceClient>
    );
    vi.mocked(dockerMod.getTenantStackStatus).mockResolvedValue({
      running: false,
    });
    const res = await GET(
      new Request('http://local/x', { headers: authHeaders() }),
      params('missing-slug')
    );
    expect(res.status).toBe(404);
  });

  it('returns tenant and stack_status', async () => {
    const tenant = {
      id: UUID,
      slug: 'acme',
      name: 'Acme',
      owner_email: 'o@a.com',
      plan: 'demo',
      status: 'active',
      services: {},
    };
    const chain = {
      schema: () => chain,
      from: () => chain,
      select: () => chain,
      is: () => chain,
      eq: () => chain,
      maybeSingle: () => Promise.resolve({ data: tenant, error: null }),
    };
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(
      chain as ReturnType<typeof supabaseMod.getServiceClient>
    );
    vi.mocked(dockerMod.getTenantStackStatus).mockResolvedValue({
      running: true,
      containers: ['n8n'],
    });
    const res = await GET(
      new Request('http://local/x', { headers: authHeaders() }),
      params('acme')
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.tenant).toEqual(tenant);
    expect(body.stack_status).toEqual({
      running: true,
      containers: ['n8n'],
    });
  });

  it('returns 500 on db error', async () => {
    const chain = {
      schema: () => chain,
      from: () => chain,
      select: () => chain,
      is: () => chain,
      eq: () => chain,
      maybeSingle: () => Promise.resolve({ data: null, error: { message: 'e' } }),
    };
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(
      chain as ReturnType<typeof supabaseMod.getServiceClient>
    );
    const res = await GET(
      new Request('http://local/x', { headers: authHeaders() }),
      params('acme')
    );
    expect(res.status).toBe(500);
  });
});

describe('PATCH /api/tenants/:id', () => {
  beforeAll(() => {
    process.env.PLATFORM_ADMIN_TOKEN = ADMIN;
  });
  afterAll(() => {
    delete process.env.PLATFORM_ADMIN_TOKEN;
  });
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 for invalid uuid', async () => {
    const res = await PATCH(
      new Request('http://local/x', {
        method: 'PATCH',
        headers: { ...authHeaders(), 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'N' }),
      }),
      params('not-uuid')
    );
    expect(res.status).toBe(400);
  });

  it('returns 404 when no row updated', async () => {
    const chain = {
      schema: () => chain,
      from: () => chain,
      update: () => chain,
      eq: () => chain,
      is: () => chain,
      select: () => chain,
      single: () => Promise.resolve({ data: null, error: null }),
    };
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(
      chain as ReturnType<typeof supabaseMod.getServiceClient>
    );
    const res = await PATCH(
      new Request('http://local/x', {
        method: 'PATCH',
        headers: { ...authHeaders(), 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'New' }),
      }),
      params(UUID)
    );
    expect(res.status).toBe(404);
  });

  it('returns updated row', async () => {
    const updated = {
      id: UUID,
      slug: 'acme',
      name: 'Renamed',
      owner_email: 'o@a.com',
      plan: 'demo',
      status: 'active',
    };
    const chain = {
      schema: () => chain,
      from: () => chain,
      update: () => chain,
      eq: () => chain,
      is: () => chain,
      select: () => chain,
      single: () => Promise.resolve({ data: updated, error: null }),
    };
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(
      chain as ReturnType<typeof supabaseMod.getServiceClient>
    );
    const res = await PATCH(
      new Request('http://local/x', {
        method: 'PATCH',
        headers: { ...authHeaders(), 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Renamed' }),
      }),
      params(UUID)
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(updated);
  });
});

describe('DELETE /api/tenants/:id', () => {
  beforeAll(() => {
    process.env.PLATFORM_ADMIN_TOKEN = ADMIN;
  });
  afterAll(() => {
    delete process.env.PLATFORM_ADMIN_TOKEN;
  });
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 for invalid uuid', async () => {
    const res = await DELETE(
      new Request('http://local/x', {
        method: 'DELETE',
        headers: authHeaders(),
      }),
      params('bad')
    );
    expect(res.status).toBe(400);
  });

  it('returns 404 when tenant does not exist', async () => {
    const chain = {
      schema: () => chain,
      from: () => chain,
      select: () => chain,
      eq: () => chain,
      is: () => chain,
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
    };
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(
      chain as ReturnType<typeof supabaseMod.getServiceClient>
    );
    const res = await DELETE(
      new Request('http://local/x', {
        method: 'DELETE',
        headers: authHeaders(),
      }),
      params(UUID)
    );
    expect(res.status).toBe(404);
  });

  it('returns 204 when delete succeeds', async () => {
    const chain = {
      schema: () => chain,
      from: () => chain,
      select: () => chain,
      eq: () => chain,
      is: () => chain,
      maybeSingle: () => Promise.resolve({ data: { id: UUID }, error: null }),
    };
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(
      chain as ReturnType<typeof supabaseMod.getServiceClient>
    );
    vi.mocked(orchestratorMod.deleteTenant).mockResolvedValue(undefined);
    const res = await DELETE(
      new Request('http://local/x', {
        method: 'DELETE',
        headers: authHeaders(),
      }),
      params(UUID)
    );
    expect(res.status).toBe(204);
  });

  it('maps deleteTenant not found to 404', async () => {
    const chain = {
      schema: () => chain,
      from: () => chain,
      select: () => chain,
      eq: () => chain,
      is: () => chain,
      maybeSingle: () => Promise.resolve({ data: { id: UUID }, error: null }),
    };
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(
      chain as ReturnType<typeof supabaseMod.getServiceClient>
    );
    vi.mocked(orchestratorMod.deleteTenant).mockRejectedValue(new Error('Tenant not found'));
    const res = await DELETE(
      new Request('http://local/x', {
        method: 'DELETE',
        headers: authHeaders(),
      }),
      params(UUID)
    );
    expect(res.status).toBe(404);
  });
});
