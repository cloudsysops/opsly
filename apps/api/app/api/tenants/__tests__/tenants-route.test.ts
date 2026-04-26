import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { GET, POST } from '../route';
import * as supabaseMod from '../../../../lib/supabase';
import * as orchestratorMod from '../../../../lib/orchestrator';

vi.mock('../../../../lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));

vi.mock('../../../../lib/orchestrator', () => ({
  provisionTenant: vi.fn(),
}));

const ADMIN = 'test-admin-token-for-tenants-route';

function authHeaders(): HeadersInit {
  return { authorization: `Bearer ${ADMIN}` };
}

function mockListChain(result: {
  data: unknown[];
  error: unknown;
  count: number | null;
}): ReturnType<typeof supabaseMod.getServiceClient> {
  const chain = {
    schema: () => chain,
    from: () => chain,
    select: () => chain,
    is: () => chain,
    order: () => chain,
    eq: () => chain,
    range: () => Promise.resolve(result),
  };
  return chain as ReturnType<typeof supabaseMod.getServiceClient>;
}

function mockTenantPostCheck(result: {
  data: unknown;
  error: unknown;
}): ReturnType<typeof supabaseMod.getServiceClient> {
  const chain = {
    schema: () => chain,
    from: () => chain,
    select: () => chain,
    eq: () => chain,
    maybeSingle: () => Promise.resolve(result),
  };
  return chain as ReturnType<typeof supabaseMod.getServiceClient>;
}

describe('GET /api/tenants', () => {
  beforeAll(() => {
    process.env.PLATFORM_ADMIN_TOKEN = ADMIN;
  });
  afterAll(() => {
    delete process.env.PLATFORM_ADMIN_TOKEN;
  });
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without Authorization', async () => {
    const req = new Request('http://local/api/tenants');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid query params', async () => {
    const req = new Request('http://local/api/tenants?page=not-a-number', {
      headers: authHeaders(),
    });
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns paged list when Supabase succeeds', async () => {
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(
      mockListChain({ data: [], error: null, count: 0 })
    );
    const req = new Request('http://local/api/tenants', {
      headers: authHeaders(),
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.data).toEqual([]);
    expect(body.total).toBe(0);
    expect(body.page).toBe(1);
  });

  it('returns 500 when list query errors', async () => {
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(
      mockListChain({
        data: [],
        error: { message: 'db' },
        count: null,
      })
    );
    const res = await GET(new Request('http://local/api/tenants', { headers: authHeaders() }));
    expect(res.status).toBe(500);
  });
});

describe('POST /api/tenants', () => {
  beforeAll(() => {
    process.env.PLATFORM_ADMIN_TOKEN = ADMIN;
  });
  afterAll(() => {
    delete process.env.PLATFORM_ADMIN_TOKEN;
  });
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without token', async () => {
    const res = await POST(
      new Request('http://local/api/tenants', {
        method: 'POST',
        body: JSON.stringify({
          slug: 'new-tenant',
          owner_email: 'o@a.com',
          plan: 'demo',
        }),
      })
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 when JSON is invalid', async () => {
    const res = await POST(
      new Request('http://local/api/tenants', {
        method: 'POST',
        headers: { ...authHeaders(), 'content-type': 'application/json' },
        body: '{',
      })
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when body fails schema', async () => {
    const res = await POST(
      new Request('http://local/api/tenants', {
        method: 'POST',
        headers: { ...authHeaders(), 'content-type': 'application/json' },
        body: JSON.stringify({ slug: 'x', owner_email: 'bad', plan: 'demo' }),
      })
    );
    expect(res.status).toBe(400);
  });

  it('returns 202 and provisions tenant', async () => {
    vi.mocked(orchestratorMod.provisionTenant).mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440001',
      slug: 'newco',
      status: 'provisioning',
    });
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(
      mockTenantPostCheck({
        data: { id: '550e8400-e29b-41d4-a716-446655440001', deleted_at: null },
        error: null,
      })
    );
    const res = await POST(
      new Request('http://local/api/tenants', {
        method: 'POST',
        headers: { ...authHeaders(), 'content-type': 'application/json' },
        body: JSON.stringify({
          slug: 'newco',
          owner_email: 'owner@newco.com',
          plan: 'startup',
        }),
      })
    );
    expect(res.status).toBe(202);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.slug).toBe('newco');
  });

  it('returns 500 when tenant post-check is missing', async () => {
    vi.mocked(orchestratorMod.provisionTenant).mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440001',
      slug: 'ghost',
      status: 'provisioning',
    });
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(
      mockTenantPostCheck({
        data: null,
        error: null,
      })
    );
    const res = await POST(
      new Request('http://local/api/tenants', {
        method: 'POST',
        headers: { ...authHeaders(), 'content-type': 'application/json' },
        body: JSON.stringify({
          slug: 'ghost',
          owner_email: 'owner@ghost.com',
          plan: 'startup',
        }),
      })
    );
    expect(res.status).toBe(500);
  });

  it('returns 500 when tenant post-check finds soft-deleted row', async () => {
    vi.mocked(orchestratorMod.provisionTenant).mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440002',
      slug: 'deletedco',
      status: 'provisioning',
    });
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(
      mockTenantPostCheck({
        data: { id: '550e8400-e29b-41d4-a716-446655440002', deleted_at: '2026-01-01T00:00:00Z' },
        error: null,
      })
    );
    const res = await POST(
      new Request('http://local/api/tenants', {
        method: 'POST',
        headers: { ...authHeaders(), 'content-type': 'application/json' },
        body: JSON.stringify({
          slug: 'deletedco',
          owner_email: 'owner@deletedco.com',
          plan: 'startup',
        }),
      })
    );
    expect(res.status).toBe(500);
  });

  it('returns 409 on unique violation', async () => {
    const err = new Error('duplicate key value violates unique constraint');
    Object.assign(err, { code: '23505' });
    vi.mocked(orchestratorMod.provisionTenant).mockRejectedValue(err);
    const res = await POST(
      new Request('http://local/api/tenants', {
        method: 'POST',
        headers: { ...authHeaders(), 'content-type': 'application/json' },
        body: JSON.stringify({
          slug: 'dup',
          owner_email: 'o@a.com',
          plan: 'demo',
        }),
      })
    );
    expect(res.status).toBe(409);
  });

  it('returns 500 on unexpected provision error', async () => {
    vi.mocked(orchestratorMod.provisionTenant).mockRejectedValue(new Error('disk full'));
    const res = await POST(
      new Request('http://local/api/tenants', {
        method: 'POST',
        headers: { ...authHeaders(), 'content-type': 'application/json' },
        body: JSON.stringify({
          slug: 'okslug',
          owner_email: 'o@a.com',
          plan: 'demo',
        }),
      })
    );
    expect(res.status).toBe(500);
  });
});
