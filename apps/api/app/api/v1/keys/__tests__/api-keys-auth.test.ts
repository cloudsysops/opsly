import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { DELETE } from '../[id]/route';
import { requireAdminAccess } from '../../../../../lib/auth';

vi.mock('../../../../../lib/auth', () => ({
  requireAdminAccess: vi.fn(),
}));

vi.mock('../../../../../lib/supabase', () => ({
  getServiceClient: vi.fn(() => ({
    schema: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
  })),
}));

describe('/api/v1/keys authorization', () => {
  it('GET should require admin access', async () => {
    const req = new NextRequest('http://localhost/api/v1/keys');
    vi.mocked(requireAdminAccess).mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }));

    const res = await GET(req);
    expect(res.status).toBe(401);
    expect(requireAdminAccess).toHaveBeenCalledWith(req);
  });

  it('POST should require admin access', async () => {
    const req = new NextRequest('http://localhost/api/v1/keys', { method: 'POST', body: JSON.stringify({}) });
    vi.mocked(requireAdminAccess).mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }));

    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(requireAdminAccess).toHaveBeenCalledWith(req);
  });

  it('DELETE should require admin access', async () => {
    const req = new NextRequest('http://localhost/api/v1/keys/123');
    vi.mocked(requireAdminAccess).mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }));

    const res = await DELETE(req, { params: Promise.resolve({ id: '123' }) });
    expect(res.status).toBe(401);
    expect(requireAdminAccess).toHaveBeenCalledWith(req);
  });
});
