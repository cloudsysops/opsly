import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { GET, POST } from '../route';
import { getServiceClient } from '@/lib/supabase';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));

// Mock resolveSuperAdminSession to return unauthorized by default
vi.mock('../../../../../lib/super-admin-auth', () => ({
  resolveSuperAdminSession: vi.fn().mockResolvedValue({ ok: false, response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }) }),
}));

const ADMIN_TOKEN = 'test-admin-token';

describe('NotebookLM Auth Vulnerability', () => {
  beforeAll(() => {
    process.env.PLATFORM_ADMIN_TOKEN = ADMIN_TOKEN;
  });

  afterAll(() => {
    delete process.env.PLATFORM_ADMIN_TOKEN;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const params = Promise.resolve({ slug: 'test-tenant' });

  it('GET /api/tenants/[slug]/notebooklm returns 401 when unauthorized', async () => {
    const req = new NextRequest('http://localhost/api/tenants/test-tenant/notebooklm');
    const res = await GET(req, { params });

    expect(res.status).toBe(401);
  });

  it('POST /api/tenants/[slug]/notebooklm returns 401 when unauthorized', async () => {
    const req = new NextRequest('http://localhost/api/tenants/test-tenant/notebooklm', {
      method: 'POST',
      body: JSON.stringify({ action: 'sync' }),
    });
    const res = await POST(req, { params });

    expect(res.status).toBe(401);
  });

  it('GET /api/tenants/[slug]/notebooklm returns 200 when authorized', async () => {
    // Mock successful authorization
    const req = new NextRequest('http://localhost/api/tenants/test-tenant/notebooklm', {
      headers: { 'x-admin-token': ADMIN_TOKEN }
    });

    // Mock tenant existence check
    vi.mocked(getServiceClient).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { slug: 'test-tenant' }, error: null }),
    } as any);

    const res = await GET(req, { params });
    expect(res.status).toBe(200);
  });
});
