import { describe, it, expect, vi } from 'vitest';
import { GET, POST } from '../route';
import { DELETE } from '../[id]/route';
import * as auth from '../../../../../lib/auth';
import * as supabase from '../../../../../lib/supabase';

vi.mock('../../../../../lib/auth', () => ({
  requireAdminAccess: vi.fn(),
}));

const mockSupabase = {
  schema: vi.fn(() => mockSupabase),
  from: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  insert: vi.fn(() => mockSupabase),
  update: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  is: vi.fn(() => mockSupabase),
  order: vi.fn(() => Promise.resolve({ data: [], error: null })),
  single: vi.fn(() => Promise.resolve({ data: {}, error: null })),
  maybeSingle: vi.fn(() => Promise.resolve({ data: {}, error: null })),
};

vi.mock('../../../../../lib/supabase', () => ({
  getServiceClient: vi.fn(() => mockSupabase),
}));

describe('API Keys Authorization', () => {
  const mockRequest = (headers: Record<string, string> = {}) => {
    return new Request('http://localhost/api/v1/keys', {
      headers: new Headers(headers),
    });
  };

  it('GET /api/v1/keys should require admin access', async () => {
    vi.mocked(auth.requireAdminAccess).mockResolvedValue(new Response('Unauthorized', { status: 401 }));

    const req = mockRequest({ 'x-tenant-id': '00000000-0000-0000-0000-000000000000' });
    const res = await GET(req);

    expect(res.status).toBe(401);
    expect(auth.requireAdminAccess).toHaveBeenCalled();
  });

  it('POST /api/v1/keys should require admin access', async () => {
    vi.mocked(auth.requireAdminAccess).mockResolvedValue(new Response('Unauthorized', { status: 401 }));

    const req = new Request('http://localhost/api/v1/keys', {
      method: 'POST',
      headers: new Headers({ 'x-tenant-id': '00000000-0000-0000-0000-000000000000' }),
      body: JSON.stringify({ name: 'test-key' }),
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
    expect(auth.requireAdminAccess).toHaveBeenCalled();
  });

  it('DELETE /api/v1/keys/:id should require admin access', async () => {
    vi.mocked(auth.requireAdminAccess).mockResolvedValue(new Response('Unauthorized', { status: 401 }));

    const req = new Request('http://localhost/api/v1/keys/123', {
      method: 'DELETE',
      headers: new Headers({ 'x-tenant-id': '00000000-0000-0000-0000-000000000000' }),
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: '00000000-0000-0000-0000-000000000001' }) });

    expect(res.status).toBe(401);
    expect(auth.requireAdminAccess).toHaveBeenCalled();
  });
});
