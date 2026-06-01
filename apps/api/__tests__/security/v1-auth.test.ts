import { describe, it, expect, vi, beforeEach } from 'vitest';

// Set env vars BEFORE imports
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

import * as notebooklmRoute from '../../app/api/v1/tenants/[ref]/notebooklm/route';
import * as keysRoute from '../../app/api/v1/keys/route';
import * as keysIdRoute from '../../app/api/v1/keys/[id]/route';

// Mock Supabase to prevent actual DB calls
vi.mock('../../lib/supabase', () => ({
  getServiceClient: vi.fn(() => ({
    schema: () => ({
      from: () => ({
        select: () => ({
          is: () => ({
            order: () => ({
              range: () => Promise.resolve({ data: [], error: null, count: 0 }),
            }),
          }),
          eq: () => ({
            is: () => ({
              order: () => Promise.resolve({ data: [], error: null }),
            }),
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { id: 'test-id' }, error: null }),
            }),
            maybeSingle: () => Promise.resolve({ data: { id: 'test-id' }, error: null }),
            single: () => Promise.resolve({ data: { slug: 'test-tenant' }, error: null }),
          }),
        }),
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: { id: 'new-id', created_at: new Date().toISOString() }, error: null }),
          }),
        }),
        update: () => ({
          eq: () => ({
             eq: () => Promise.resolve({ error: null }),
          }),
        }),
      }),
    }),
    from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: { slug: 'test-tenant' }, error: null }),
          }),
        }),
    }),
  })),
}));

describe('V1 Security Auth Checks (Reproduction)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PLATFORM_ADMIN_TOKEN = 'secret-admin-token';
  });

  describe('NotebookLM Route', () => {
    it('GET /api/v1/tenants/[ref]/notebooklm DENIES unauthenticated access', async () => {
      const req = new Request('http://local/api/v1/tenants/test-tenant/notebooklm');
      // @ts-ignore - Next.js context mock
      const res = await notebooklmRoute.GET(req, { params: Promise.resolve({ ref: 'test-tenant' }) });

      expect(res.status).toBe(401);
    });

    it('POST /api/v1/tenants/[ref]/notebooklm DENIES unauthenticated access', async () => {
      const req = new Request('http://local/api/v1/tenants/test-tenant/notebooklm', {
        method: 'POST',
        body: JSON.stringify({ action: 'sync' })
      });
      // @ts-ignore - Next.js context mock
      const res = await notebooklmRoute.POST(req, { params: Promise.resolve({ ref: 'test-tenant' }) });

      expect(res.status).toBe(401);
    });
  });

  describe('Keys Route', () => {
    it('GET /api/v1/keys DENIES unauthenticated access', async () => {
      const req = new Request('http://local/api/v1/keys', {
        headers: { 'x-tenant-id': '550e8400-e29b-41d4-a716-446655440000' }
      });
      const res = await keysRoute.GET(req);

      expect(res.status).toBe(401);
    });

    it('POST /api/v1/keys DENIES unauthenticated access', async () => {
      const req = new Request('http://local/api/v1/keys', {
        method: 'POST',
        headers: { 'x-tenant-id': '550e8400-e29b-41d4-a716-446655440000' },
        body: JSON.stringify({ name: 'test-key' })
      });
      const res = await keysRoute.POST(req);

      expect(res.status).toBe(401);
    });
  });

  describe('Keys ID Route', () => {
    it('DELETE /api/v1/keys/[id] DENIES unauthenticated access', async () => {
      const req = new Request('http://local/api/v1/keys/550e8400-e29b-41d4-a716-446655440001', {
        method: 'DELETE',
        headers: { 'x-tenant-id': '550e8400-e29b-41d4-a716-446655440000' }
      });
      // @ts-ignore
      const res = await keysIdRoute.DELETE(req, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440001' }) });

      expect(res.status).toBe(401);
    });
  });
});
