import { describe, expect, it, vi, beforeEach } from 'vitest';
import { POST as POST_FORMS } from '../[tenantSlug]/forms/route';
import { GET as GET_EXPORT } from '../[tenantSlug]/forms/[formId]/export/route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/portal-trusted-identity', () => ({
  resolveTrustedPortalSession: vi.fn().mockResolvedValue({
    ok: false,
    response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }),
  tenantSlugMatchesSession: vi.fn().mockReturnValue(true),
  PORTAL_READ_ROLES: ['owner', 'admin', 'operator', 'viewer'],
  PORTAL_WRITE_ROLES: ['owner', 'admin', 'operator']
}));

vi.mock('@/lib/supabase', () => ({
  getServiceClient: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: 'mock-id', title: 'Mock' }, error: null }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    schema: vi.fn().mockReturnThis(),
  })),
}));

describe('Peskids Portal API Authorization Vulnerabilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST /forms should require authorization', async () => {
    const req = new NextRequest('http://localhost/api/peskids/portal/test-tenant/forms', {
      method: 'POST',
      body: JSON.stringify({ title: 'New Form' }),
    });
    const params = Promise.resolve({ tenantSlug: 'test-tenant' });

    const res = await POST_FORMS(req, { params });

    expect(res.status).toBe(401);
  });

  it('GET /export should require authorization', async () => {
    const req = new NextRequest('http://localhost/api/peskids/portal/test-tenant/forms/form-123/export?format=csv', {
      method: 'GET',
    });
    const params = Promise.resolve({ tenantSlug: 'test-tenant', formId: 'form-123' });

    const res = await GET_EXPORT(req, { params });

    expect(res.status).toBe(401);
  });

  it('allows access with a valid session', async () => {
    const { resolveTrustedPortalSession } = await import('@/lib/portal-trusted-identity');
    vi.mocked(resolveTrustedPortalSession).mockResolvedValue({
      ok: true,
      session: {
        user: { id: 'test-user' },
        tenant: { id: 'test-tenant-id', slug: 'test-tenant' },
        roles: ['owner'],
      } as any,
    });

    const reqPost = new NextRequest('http://localhost/api/peskids/portal/test-tenant/forms', {
      method: 'POST',
      body: JSON.stringify({ title: 'New Form' }),
    });
    const paramsPost = Promise.resolve({ tenantSlug: 'test-tenant' });
    const resPost = await POST_FORMS(reqPost, { params: paramsPost });
    expect(resPost.status).toBe(200);

    const reqGet = new NextRequest('http://localhost/api/peskids/portal/test-tenant/forms/form-123/export?format=csv', {
      method: 'GET',
    });
    const paramsGet = Promise.resolve({ tenantSlug: 'test-tenant', formId: 'form-123' });
    const resGet = await GET_EXPORT(reqGet, { params: paramsGet });
    expect(resGet.status).toBe(200);
  });
});
