import { describe, expect, it, vi, beforeEach } from 'vitest';
import { POST } from '../[tenantSlug]/submissions/bulk-grade/route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/portal-trusted-identity', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/portal-trusted-identity')>();
  return {
    ...actual,
    resolveTrustedPortalSession: vi.fn().mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    }),
    tenantSlugMatchesSession: vi.fn().mockReturnValue(true),
  };
});

vi.mock('@/lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));

describe('POST /api/peskids/portal/[tenantSlug]/submissions/bulk-grade authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no session is present (runTrustedPortalDalForPathSlug fails)', async () => {
    const req = new NextRequest('http://localhost/api/peskids/portal/test-tenant/submissions/bulk-grade', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const params = Promise.resolve({ tenantSlug: 'test-tenant' });
    const res = await POST(req, { params });
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
    const mockUpdate = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockIn = vi.fn().mockReturnThis();
    const mockSelect = vi.fn().mockResolvedValue({ data: [{ submission_id: 'sub-1' }], error: null });

    const { getServiceClient } = await import('@/lib/supabase');
    vi.mocked(getServiceClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        in: mockIn,
        select: mockSelect,
      }),
      rpc: mockRpc,
    } as any);

    const req = new NextRequest('http://localhost/api/peskids/portal/test-tenant/submissions/bulk-grade', {
      method: 'POST',
      body: JSON.stringify({
        submissionIds: ['sub-1'],
        score: 85,
        feedback: 'Great job!',
      }),
    });

    const params = Promise.resolve({ tenantSlug: 'test-tenant' });
    const res = await POST(req, { params });

    expect(res.status).toBe(200);

    // Verify audit log received the correct actorId
    expect(mockRpc).toHaveBeenCalledWith('log_audit_event', expect.objectContaining({
      p_actor_id: 'test-user',
      p_tenant_slug: 'test-tenant',
      p_action: 'form_submissions_bulk_graded',
    }));
  });
});
