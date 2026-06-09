import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { POST } from '../publish/route';
import { NextRequest } from 'next/server';

// Mock resolveSuperAdminSession to avoid hitting Supabase in tests
vi.mock('../../../../lib/super-admin-auth', () => ({
  resolveSuperAdminSession: vi.fn().mockResolvedValue({ ok: false, response: { status: 401 } }),
}));

describe('POST /api/social/publish authorization', () => {
  const ADMIN_TOKEN = 'test-admin-token';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PLATFORM_ADMIN_TOKEN = ADMIN_TOKEN;
  });

  afterEach(() => {
    delete process.env.PLATFORM_ADMIN_TOKEN;
  });

  it('returns 401 when no authorization header is provided', async () => {
    const req = new NextRequest('http://localhost/api/social/publish', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 when an invalid admin token is provided', async () => {
    const req = new NextRequest('http://localhost/api/social/publish', {
      method: 'POST',
      headers: {
        authorization: 'Bearer invalid-token',
      },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('allows access with a valid admin token (fails later due to invalid body)', async () => {
    const req = new NextRequest('http://localhost/api/social/publish', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    // It should pass auth and then fail validation (400)
    expect(res.status).toBe(400);
  });
});
