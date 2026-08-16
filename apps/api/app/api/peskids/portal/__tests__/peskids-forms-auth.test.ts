import { describe, expect, it, vi, beforeEach } from 'vitest';
import { POST } from '../[tenantSlug]/forms/route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/portal-trusted-identity', () => ({
  resolveTrustedPortalSession: vi.fn().mockResolvedValue({
    ok: false,
    response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
  }),
  tenantSlugMatchesSession: vi.fn().mockReturnValue(true),
  PORTAL_READ_ROLES: ['owner', 'admin', 'operator', 'viewer'],
  PORTAL_WRITE_ROLES: ['owner', 'admin', 'operator'],
  PORTAL_READ_ACCESS: { allowedRoles: ['owner', 'admin', 'operator', 'viewer'] },
  PORTAL_WRITE_ACCESS: { allowedRoles: ['owner', 'admin', 'operator'] },
}));

vi.mock('@/lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));

describe('POST /api/peskids/portal/[tenantSlug]/forms authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no session is present', async () => {
    const req = new NextRequest('http://localhost/api/peskids/portal/test-tenant/forms', {
      method: 'POST',
      body: JSON.stringify({ title: 'New Form' }),
    });
    const params = Promise.resolve({ tenantSlug: 'test-tenant' });

    const res = await POST(req, { params });

    expect(res.status).toBe(401);
  });
});
