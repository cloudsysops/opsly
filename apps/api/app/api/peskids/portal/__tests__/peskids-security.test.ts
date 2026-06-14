import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GET as EXPORT_GET } from '../[tenantSlug]/forms/[formId]/export/route';
import { POST as FORMS_POST } from '../[tenantSlug]/forms/route';
import { NextRequest } from 'next/server';
import * as portalIdentity from '@/lib/portal-trusted-identity';
import * as supabaseLib from '@/lib/supabase';

vi.mock('@/lib/portal-trusted-identity', () => ({
  resolveTrustedPortalSession: vi.fn(),
  tenantSlugMatchesSession: vi.fn().mockReturnValue(true),
  PORTAL_READ_ROLES: ['admin', 'teacher', 'operator', 'owner', 'viewer'],
  PORTAL_WRITE_ROLES: ['admin', 'teacher', 'operator', 'owner']
}));

vi.mock('@/lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));

describe('Peskids Portal Security Fix Verification', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Default to unauthorized
    vi.mocked(portalIdentity.resolveTrustedPortalSession).mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    });

    vi.mocked(portalIdentity.tenantSlugMatchesSession).mockReturnValue(true);
  });

  describe('GET /api/peskids/portal/[tenantSlug]/forms/[formId]/export', () => {
    it('returns 401 when no session is present', async () => {
      const req = new NextRequest('http://localhost/api/peskids/portal/test-tenant/forms/form-1/export?format=csv');
      const params = Promise.resolve({ tenantSlug: 'test-tenant', formId: 'form-1' });

      const res = await EXPORT_GET(req, { params });
      expect(res.status).toBe(401);
    });

    it('allows access with a valid session and passes correct actorId to auditing', async () => {
      vi.mocked(portalIdentity.resolveTrustedPortalSession).mockResolvedValue({
        ok: true,
        session: {
          user: { id: 'test-user' },
          tenant: { id: 'test-tenant-id', slug: 'test-tenant' },
          roles: ['teacher'],
        } as any,
      });

      const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'f1', title: 'Form 1' }, error: null });
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });

      vi.mocked(supabaseLib.getServiceClient).mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: mockSelect,
          eq: mockEq,
          order: mockOrder,
          single: mockSingle,
        }),
        rpc: mockRpc,
      } as any);

      const req = new NextRequest('http://localhost/api/peskids/portal/test-tenant/forms/form-1/export?format=csv');
      const params = Promise.resolve({ tenantSlug: 'test-tenant', formId: 'form-1' });

      const res = await EXPORT_GET(req, { params });

      expect(res.status).toBe(200);

      // Verify audit log received the correct actorId
      expect(mockRpc).toHaveBeenCalledWith('log_audit_event', expect.objectContaining({
        p_actor_id: 'test-user',
        p_tenant_slug: 'test-tenant',
        p_action: 'form_submissions_exported',
      }));
    });
  });

  describe('POST /api/peskids/portal/[tenantSlug]/forms', () => {
    it('returns 401 when no session is present', async () => {
      const req = new NextRequest('http://localhost/api/peskids/portal/test-tenant/forms', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Form' }),
      });
      const params = Promise.resolve({ tenantSlug: 'test-tenant' });

      const res = await FORMS_POST(req, { params });
      expect(res.status).toBe(401);
    });

    it('allows access with a valid session', async () => {
      vi.mocked(portalIdentity.resolveTrustedPortalSession).mockResolvedValue({
        ok: true,
        session: {
          user: { id: 'test-user' },
          tenant: { id: 'test-tenant-id', slug: 'test-tenant' },
          roles: ['admin'],
        } as any,
      });

      const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'f1', created_at: new Date().toISOString() }, error: null });
      const mockSelect = vi.fn().mockReturnThis();
      const mockInsert = vi.fn().mockReturnThis();

      vi.mocked(supabaseLib.getServiceClient).mockReturnValue({
        from: vi.fn().mockReturnValue({
          insert: mockInsert,
          select: mockSelect,
          single: mockSingle,
        }),
      } as any);

      const req = new NextRequest('http://localhost/api/peskids/portal/test-tenant/forms', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Form' }),
      });
      const params = Promise.resolve({ tenantSlug: 'test-tenant' });

      const res = await FORMS_POST(req, { params });
      expect(res.status).toBe(200);
    });
  });
});
