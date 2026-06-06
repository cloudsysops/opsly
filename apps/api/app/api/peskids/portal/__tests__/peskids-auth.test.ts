import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
// @ts-ignore
import { POST as POST_FORMS } from '../[tenantSlug]/forms/route';
// @ts-ignore
import { POST as POST_BULK_GRADE } from '../[tenantSlug]/submissions/bulk-grade/route';
// @ts-ignore
import { GET as GET_EXPORT } from '../[tenantSlug]/forms/[formId]/export/route';

vi.mock('@/lib/supabase', () => ({
  getServiceClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'new-form-id', title: 'Test Form', created_at: new Date().toISOString() }, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
}));

// Mock @/lib/api-response to avoid import issues
vi.mock('@/lib/api-response', () => ({
  jsonError: vi.fn((message, status) => new Response(JSON.stringify({ error: message }), { status })),
  jsonOk: vi.fn((data) => new Response(JSON.stringify(data), { status: 200 })),
}));

// Mock @/lib/portal-tenant-dal to simulate authorization
const mockRunTrustedPortalDalForPathSlug = vi.fn();
vi.mock('@/lib/portal-tenant-dal', () => ({
  runTrustedPortalDalForPathSlug: (req: any, slug: any, fn: any) => mockRunTrustedPortalDalForPathSlug(req, slug, fn),
  PORTAL_READ_ACCESS: {},
}));

describe('Peskids Portal Authorization', () => {
  const tenantSlug = 'test-tenant';

  describe('POST /api/peskids/portal/[tenantSlug]/forms', () => {
    it('returns 401/403 when unauthorized', async () => {
      mockRunTrustedPortalDalForPathSlug.mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }));

      const req = new NextRequest(`http://localhost/api/peskids/portal/${tenantSlug}/forms`, {
        method: 'POST',
        body: JSON.stringify({ title: 'Test Form' }),
      });

      const res = await POST_FORMS(req, { params: Promise.resolve({ tenantSlug }) });
      expect(res.status).toBe(401);
    });

    it('allows access when authorized', async () => {
      mockRunTrustedPortalDalForPathSlug.mockImplementationOnce((req, slug, fn) => fn({ user: { id: 'test-user' } }));

      const req = new NextRequest(`http://localhost/api/peskids/portal/${tenantSlug}/forms`, {
        method: 'POST',
        body: JSON.stringify({ title: 'Test Form' }),
      });

      const res = await POST_FORMS(req, { params: Promise.resolve({ tenantSlug }) });
      // Should proceed to DB logic and return 200 (mocked)
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/peskids/portal/[tenantSlug]/submissions/bulk-grade', () => {
    it('returns 401/403 when unauthorized', async () => {
      mockRunTrustedPortalDalForPathSlug.mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }));

      const req = new NextRequest(`http://localhost/api/peskids/portal/${tenantSlug}/submissions/bulk-grade`, {
        method: 'POST',
        body: JSON.stringify({ submissionIds: ['sub1'], score: 100 }),
      });

      const res = await POST_BULK_GRADE(req, { params: Promise.resolve({ tenantSlug }) });
      expect(res.status).toBe(401);
    });

    it('allows access when authorized', async () => {
        mockRunTrustedPortalDalForPathSlug.mockImplementationOnce((req, slug, fn) => fn({ user: { id: 'test-user' } }));

        const req = new NextRequest(`http://localhost/api/peskids/portal/${tenantSlug}/submissions/bulk-grade`, {
          method: 'POST',
          body: JSON.stringify({ submissionIds: ['sub1'], score: 100 }),
        });

        const res = await POST_BULK_GRADE(req, { params: Promise.resolve({ tenantSlug }) });
        expect(res.status).toBe(200);
      });
  });

  describe('GET /api/peskids/portal/[tenantSlug]/forms/[formId]/export', () => {
    it('returns 401/403 when unauthorized', async () => {
      mockRunTrustedPortalDalForPathSlug.mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }));

      const formId = 'test-form';
      const req = new NextRequest(`http://localhost/api/peskids/portal/${tenantSlug}/forms/${formId}/export?format=json`);

      const res = await GET_EXPORT(req, { params: Promise.resolve({ tenantSlug, formId }) });
      expect(res.status).toBe(401);
    });

    it('allows access when authorized', async () => {
        mockRunTrustedPortalDalForPathSlug.mockImplementationOnce((req, slug, fn) => fn({ user: { id: 'test-user' } }));

        const formId = 'test-form';
        const req = new NextRequest(`http://localhost/api/peskids/portal/${tenantSlug}/forms/${formId}/export?format=json`);

        const res = await GET_EXPORT(req, { params: Promise.resolve({ tenantSlug, formId }) });
        // Export returns 200 in mock because form is mocked to exist
        expect(res.status).toBe(200);
      });
  });
});
