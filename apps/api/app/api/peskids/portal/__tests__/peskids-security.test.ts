import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GET as exportGET } from '../[tenantSlug]/forms/[formId]/export/route';
import { POST as formsPOST } from '../[tenantSlug]/forms/route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/portal-tenant-dal', () => ({
  runTrustedPortalDalForPathSlug: vi.fn(async (request, pathSlug, fn, options) => {
    // Return unauthorized by default to simulate failed session resolution
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }),
  PORTAL_READ_ACCESS: { allowedRoles: ['admin', 'teacher', 'owner', 'operator', 'viewer'] },
  PORTAL_WRITE_ACCESS: { allowedRoles: ['owner', 'admin', 'operator'] }
}));

vi.mock('@/lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));

describe('Peskids Portal Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /export requires authentication', async () => {
    const req = new NextRequest('http://localhost/api/peskids/portal/test-tenant/forms/form-1/export?format=csv');
    const params = Promise.resolve({ tenantSlug: 'test-tenant', formId: 'form-1' });

    const res = await exportGET(req, { params });
    expect(res.status).toBe(401);
  });

  it('POST /forms requires authentication', async () => {
    const req = new NextRequest('http://localhost/api/peskids/portal/test-tenant/forms', {
      method: 'POST',
      body: JSON.stringify({ title: 'New Form' }),
    });
    const params = Promise.resolve({ tenantSlug: 'test-tenant' });

    const res = await formsPOST(req, { params });
    expect(res.status).toBe(401);
  });

  it('GET /export uses correct actorId in audit logs', async () => {
    const { runTrustedPortalDalForPathSlug } = await import('@/lib/portal-tenant-dal');
    vi.mocked(runTrustedPortalDalForPathSlug).mockImplementation(async (request, pathSlug, fn, options) => {
      const mockSession = {
        user: { id: 'test-user-123' },
        tenant: { id: 'test-tenant-id', slug: 'test-tenant' },
        membership: { role: 'teacher' }
      };
      return fn(mockSession as any);
    });

    const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockFrom = vi.fn();
    const mockSelect = vi.fn();
    const mockEq = vi.fn();
    const mockOrder = vi.fn();
    const mockSingle = vi.fn();

    mockFrom.mockReturnValue({
      select: mockSelect,
    });

    mockSelect.mockReturnValue({
      eq: mockEq,
    });

    mockEq.mockReturnValue({
      eq: mockEq,
      single: mockSingle,
      order: mockOrder,
    });

    mockOrder.mockReturnValue({
      then: (resolve: any) => resolve({ data: [], error: null }),
    });

    mockSingle.mockResolvedValue({ data: { id: 'form-1', title: 'Test Form' }, error: null });

    const { getServiceClient } = await import('@/lib/supabase');
    vi.mocked(getServiceClient).mockReturnValue({
      from: mockFrom,
      rpc: mockRpc,
    } as any);

    const req = new NextRequest('http://localhost/api/peskids/portal/test-tenant/forms/form-1/export?format=csv');
    const params = Promise.resolve({ tenantSlug: 'test-tenant', formId: 'form-1' });

    const res = await exportGET(req, { params });
    expect(res.status).toBe(200);

    // Verify audit log received the correct actorId
    expect(mockRpc).toHaveBeenCalledWith('log_audit_event', expect.objectContaining({
      p_actor_id: 'test-user-123',
      p_tenant_slug: 'test-tenant',
      p_action: 'form_submissions_exported',
    }));
  });
});
