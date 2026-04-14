import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';

vi.mock('../../../../../lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));

vi.mock('../../../../../lib/auth', () => ({
  requireAdminToken: vi.fn(),
}));

import { getServiceClient } from '../../../../../lib/supabase';
import { requireAdminToken } from '../../../../../lib/auth';

const ADMIN_TOKEN = 'test-admin-token';

function mockAuth(allow = true) {
  (requireAdminToken as ReturnType<typeof vi.fn>).mockReturnValue(
    allow ? null : Response.json({ error: 'Unauthorized' }, { status: 401 })
  );
}

function buildSupabaseMock(rows: object[], error: object | null = null) {
  const queryBuilder: Record<string, unknown> = {};
  queryBuilder.select = vi.fn().mockReturnValue(queryBuilder);
  queryBuilder.order = vi.fn().mockReturnValue(queryBuilder);
  queryBuilder.limit = vi.fn().mockReturnValue(queryBuilder);
  queryBuilder.eq = vi.fn().mockReturnValue(queryBuilder);
  queryBuilder.gte = vi.fn().mockReturnValue(queryBuilder);
  queryBuilder.lte = vi.fn().mockReturnValue(queryBuilder);
  queryBuilder.lt = vi.fn().mockReturnValue(queryBuilder);
  // Resolve the promise at the end of the chain
  Object.defineProperty(queryBuilder, 'then', {
    get() {
      return (resolve: (v: unknown) => void) => resolve({ data: rows, error });
    },
  });

  (getServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
    schema: () => ({
      from: () => queryBuilder,
    }),
  });

  return queryBuilder;
}

function makeRequest(params: Record<string, string> = {}): Request {
  const url = new URL('http://localhost/api/admin/audit');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new Request(url.toString(), {
    method: 'GET',
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
  });
}

const sampleEvents = [
  {
    id: 'aaa-111',
    tenant_slug: 'acme',
    actor_email: 'admin@acme.com',
    action: 'POST',
    resource: '/api/tenants',
    status_code: 201,
    ip: '1.2.3.4',
    created_at: '2026-04-10T01:00:00Z',
    metadata: {},
  },
  {
    id: 'bbb-222',
    tenant_slug: 'acme',
    actor_email: 'admin@acme.com',
    action: 'DELETE',
    resource: '/api/tenants/123',
    status_code: 200,
    ip: '1.2.3.4',
    created_at: '2026-04-10T00:30:00Z',
    metadata: {},
  },
];

describe('GET /api/admin/audit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth(true);
  });

  it('returns 401 when no admin token', async () => {
    mockAuth(false);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it('returns events list with pagination metadata', async () => {
    buildSupabaseMock(sampleEvents);
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(2);
    expect(body.pagination.hasNextPage).toBe(false);
    expect(body.pagination.nextCursor).toBeNull();
  });

  it('returns hasNextPage=true and nextCursor when more results exist', async () => {
    // Return limit+1 rows to signal more pages exist (limit default 50, so make 51)
    const many = Array.from({ length: 51 }, (_, i) => ({
      ...sampleEvents[0],
      id: `id-${i}`,
    }));
    buildSupabaseMock(many);
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body.pagination.hasNextPage).toBe(true);
    expect(body.pagination.nextCursor).toBe('id-49');
    expect(body.items).toHaveLength(50);
  });

  it('passes slug filter to query', async () => {
    const qb = buildSupabaseMock(sampleEvents);
    await GET(makeRequest({ slug: 'acme' }));
    expect(qb.eq).toHaveBeenCalledWith('tenant_slug', 'acme');
  });

  it('passes action filter to query uppercased', async () => {
    const qb = buildSupabaseMock(sampleEvents);
    await GET(makeRequest({ action: 'post' }));
    expect(qb.eq).toHaveBeenCalledWith('action', 'POST');
  });

  it('passes from/to filters', async () => {
    const qb = buildSupabaseMock(sampleEvents);
    await GET(makeRequest({ from: '2026-04-01T00:00:00Z', to: '2026-04-10T00:00:00Z' }));
    expect(qb.gte).toHaveBeenCalledWith('created_at', '2026-04-01T00:00:00Z');
    expect(qb.lte).toHaveBeenCalledWith('created_at', '2026-04-10T00:00:00Z');
  });

  it('passes after cursor to query', async () => {
    const qb = buildSupabaseMock(sampleEvents);
    await GET(makeRequest({ after: 'cursor-uuid-here' }));
    expect(qb.lt).toHaveBeenCalledWith('id', 'cursor-uuid-here');
  });

  it('clamps limit to 200', async () => {
    const qb = buildSupabaseMock([]);
    await GET(makeRequest({ limit: '999' }));
    // limit(201) — 200+1 for hasNextPage detection
    expect(qb.limit).toHaveBeenCalledWith(201);
  });

  it('uses default limit 50 when not specified', async () => {
    const qb = buildSupabaseMock([]);
    await GET(makeRequest());
    expect(qb.limit).toHaveBeenCalledWith(51);
  });

  it('returns 500 when Supabase returns error', async () => {
    buildSupabaseMock([], { message: 'connection failed' });
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/failed/i);
  });

  it('returns empty items array when no events found', async () => {
    buildSupabaseMock([]);
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body.items).toEqual([]);
    expect(body.pagination.hasNextPage).toBe(false);
  });
});
