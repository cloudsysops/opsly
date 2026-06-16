import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GET } from '../[tenantSlug]/forms/[formId]/export/route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/portal-trusted-identity', () => ({
  resolveTrustedPortalSession: vi.fn().mockResolvedValue({
    ok: false,
    response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }),
  tenantSlugMatchesSession: vi.fn().mockReturnValue(true),
  PORTAL_READ_ROLES: ['admin', 'teacher'],
  PORTAL_WRITE_ROLES: ['admin', 'teacher'],
  PORTAL_READ_ACCESS: { allowedRoles: ['admin', 'teacher'] }
}));

vi.mock('@/lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));

describe('GET /api/peskids/portal/[tenantSlug]/forms/[formId]/export authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no session is present (runTrustedPortalDalForPathSlug fails)', async () => {
    const req = new NextRequest('http://localhost/api/peskids/portal/test-tenant/forms/form-1/export?format=csv');
    const params = Promise.resolve({ tenantSlug: 'test-tenant', formId: 'form-1' });

    const res = await GET(req, { params });

    expect(res.status).toBe(401);
  });

  it('allows access with a valid session and passes correct actorId to auditing', async () => {
    const { resolveTrustedPortalSession } = await import('@/lib/portal-trusted-identity');
    vi.mocked(resolveTrustedPortalSession).mockResolvedValue({
      ok: true,
      session: {
        user: { id: 'test-user' },
        tenant: { id: 'test-tenant-id', slug: 'test-tenant' },
        roles: ['teacher'],
      } as any,
    });

    const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'form-1', title: 'Test Form' }, error: null }),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    const { getServiceClient } = await import('@/lib/supabase');
    vi.mocked(getServiceClient).mockReturnValue({
      from: mockFrom,
      rpc: mockRpc,
    } as any);

    const req = new NextRequest('http://localhost/api/peskids/portal/test-tenant/forms/form-1/export?format=csv');
    const params = Promise.resolve({ tenantSlug: 'test-tenant', formId: 'form-1' });
    const res = await GET(req, { params });

    expect(res.status).toBe(200);

    // Verify audit log received the correct actorId
    expect(mockRpc).toHaveBeenCalledWith('log_audit_event', expect.objectContaining({
      p_actor_id: 'test-user',
      p_tenant_slug: 'test-tenant',
      p_action: 'form_submissions_exported',
    }));
  });
});
