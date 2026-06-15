import { describe, it, expect, vi } from 'vitest';
import { GET, POST } from '../route';
import * as auth from '@/lib/auth';
import * as supabase from '@/lib/supabase';

const mockSupabase = {
  from: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  single: vi.fn(() => Promise.resolve({ data: { id: 'tenant-123', slug: 'test-tenant' }, error: null })),
};

vi.mock('@/lib/supabase', () => ({
  getServiceClient: vi.fn(() => mockSupabase),
}));

vi.mock('@/lib/auth', () => ({
  requireAdminAccess: vi.fn(),
}));

describe('NotebookLM Authorization', () => {
  const mockParams = Promise.resolve({ ref: 'test-tenant' });

  it('GET /api/v1/tenants/[ref]/notebooklm should require admin access', async () => {
    vi.mocked(auth.requireAdminAccess).mockResolvedValue(new Response('Unauthorized', { status: 401 }));

    const req = new Request('http://localhost/api/v1/tenants/test-tenant/notebooklm');
    const res = await GET(req, { params: mockParams });

    expect(res.status).toBe(401);
    expect(auth.requireAdminAccess).toHaveBeenCalled();
  });

  it('POST /api/v1/tenants/[ref]/notebooklm should require admin access', async () => {
    vi.mocked(auth.requireAdminAccess).mockResolvedValue(new Response('Unauthorized', { status: 401 }));

    const req = new Request('http://localhost/api/v1/tenants/test-tenant/notebooklm', {
      method: 'POST',
      body: JSON.stringify({ action: 'sync' }),
    });
    const res = await POST(req, { params: mockParams });

    expect(res.status).toBe(401);
    expect(auth.requireAdminAccess).toHaveBeenCalled();
  });

  it('GET should proceed when authorized', async () => {
    vi.mocked(auth.requireAdminAccess).mockResolvedValue(null);

    const req = new Request('http://localhost/api/v1/tenants/test-tenant/notebooklm');
    const res = await GET(req, { params: mockParams });

    expect(res.status).toBe(200);
  });
});
