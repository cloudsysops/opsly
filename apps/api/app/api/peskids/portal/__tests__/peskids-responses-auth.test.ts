import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GET } from '../[tenantSlug]/forms/[formId]/responses/route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/portal-trusted-identity', () => ({
  resolveTrustedPortalSession: vi.fn().mockResolvedValue({
    ok: false,
    response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
  }),
  tenantSlugMatchesSession: vi.fn().mockReturnValue(true),
  PORTAL_READ_ROLES: ['admin', 'teacher'],
  PORTAL_WRITE_ROLES: ['admin', 'teacher'],
  PORTAL_READ_ACCESS: { allowedRoles: ['admin', 'teacher'] },
}));

vi.mock('@/lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));

describe('GET /api/peskids/portal/[tenantSlug]/forms/[formId]/responses authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no session is present', async () => {
    const req = new NextRequest(
      'http://localhost/api/peskids/portal/test-tenant/forms/form-1/responses'
    );
    const params = Promise.resolve({ tenantSlug: 'test-tenant', formId: 'form-1' });

    const res = await GET(req, { params });

    expect(res.status).toBe(401);
  });

  it('allows access with a valid session and returns form responses', async () => {
    const { resolveTrustedPortalSession } = await import('@/lib/portal-trusted-identity');
    vi.mocked(resolveTrustedPortalSession).mockResolvedValue({
      ok: true,
      session: {
        user: { id: 'test-user' },
        tenant: { id: 'test-tenant-id', slug: 'test-tenant' },
        roles: ['teacher'],
      } as unknown as ReturnType<typeof resolveTrustedPortalSession> extends Promise<infer S>
        ? S extends { session: infer SS }
          ? SS
          : never
        : never,
    });

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'form-1' },
        error: null,
      }),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            submission_id: 'sub-1',
            submission_data: { q1: 'ans1' },
            completed_at: '2026-06-30T00:00:00.000Z',
          },
        ],
        error: null,
      }),
    });

    const { getServiceClient } = await import('@/lib/supabase');
    vi.mocked(getServiceClient).mockReturnValue({
      schema: vi.fn().mockReturnValue({
        from: mockFrom,
      }),
    } as unknown as ReturnType<typeof getServiceClient>);

    const req = new NextRequest(
      'http://localhost/api/peskids/portal/test-tenant/forms/form-1/responses'
    );
    const params = Promise.resolve({ tenantSlug: 'test-tenant', formId: 'form-1' });
    const res = await GET(req, { params });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(1);
    expect(body.responses[0].submissionId).toBe('sub-1');
  });
});
