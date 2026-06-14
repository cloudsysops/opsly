import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import * as auth from '@/lib/auth';

vi.mock('@/lib/auth', () => ({
  requireAdminAccess: vi.fn(),
}));

// Mock supabase client to avoid DB calls during auth check tests
vi.mock('@/lib/supabase', () => ({
  getServiceClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Not found' } })),
        })),
      })),
    })),
  })),
}));

describe('NotebookLM Authorization', () => {
  const mockParams = Promise.resolve({ ref: 'test-tenant' });

  it('GET /api/v1/tenants/[ref]/notebooklm should require admin access', async () => {
    // Mock unauthorized response from requireAdminAccess
    vi.mocked(auth.requireAdminAccess).mockResolvedValue(new Response('Unauthorized', { status: 401 }));

    const req = new NextRequest('http://localhost/api/v1/tenants/test-tenant/notebooklm');
    const res = await GET(req, { params: mockParams });

    // This will fail initially because the route doesn't call requireAdminAccess
    expect(res.status).toBe(401);
    expect(auth.requireAdminAccess).toHaveBeenCalled();
  });

  it('POST /api/v1/tenants/[ref]/notebooklm should require admin access', async () => {
    vi.mocked(auth.requireAdminAccess).mockResolvedValue(new Response('Unauthorized', { status: 401 }));

    const req = new NextRequest('http://localhost/api/v1/tenants/test-tenant/notebooklm', {
      method: 'POST',
      body: JSON.stringify({ action: 'sync' }),
    });
    const res = await POST(req, { params: mockParams });

    expect(res.status).toBe(401);
    expect(auth.requireAdminAccess).toHaveBeenCalled();
  });
});
