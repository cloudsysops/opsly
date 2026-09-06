import { beforeEach, describe, expect, it, vi } from 'vitest';

let cookieTokenValue = '';
const cookieStore = {
  get: vi.fn((name: string) => {
    if (name === 'admin-token' && cookieTokenValue) return { value: cookieTokenValue };
    return undefined;
  }),
  getAll: vi.fn(() => []),
};

vi.mock('next/headers', () => ({
  cookies: () => cookieStore,
}));

function makeRequest(headers: Record<string, string> = {}, cookies: Record<string, string> = {}) {
  return {
    headers: new Headers(headers),
    cookies: {
      get(name: string) {
        const value = cookies[name];
        return value ? { value } : undefined;
      },
      getAll() {
        return Object.entries(cookies).map(([name, value]) => ({ name, value }));
      },
    },
  } as never;
}

function chunkedAuthCookies(accessToken: string): Record<string, string> {
  const encoded = `base64-${Buffer.from(JSON.stringify({ access_token: accessToken })).toString('base64')}`;
  const splitAt = Math.floor(encoded.length / 2);
  return {
    'sb-project-auth-token.0': encoded.slice(0, splitAt),
    'sb-project-auth-token.1': encoded.slice(splitAt),
  };
}

describe('validateStaffRequest', () => {
  beforeEach(() => {
    cookieTokenValue = '';
    cookieStore.getAll.mockClear();
    delete process.env.DASHBOARD_ADMIN_SECRET;
    delete process.env.PESKIDS_ENVIRONMENT;
    delete process.env.PESKIDS_ALLOW_DASHBOARD_ADMIN_SECRET;
    process.env.NEXT_PUBLIC_TENANT_ID = 'peskids';
    process.env.SUPABASE_URL = 'https://project.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
    global.fetch = vi.fn();
  });

  it('accepts the dashboard secret', async () => {
    process.env.DASHBOARD_ADMIN_SECRET = 'secret';
    const { validateStaffRequest } = await import('../staff-auth');

    const result = await validateStaffRequest(makeRequest({ authorization: 'Bearer secret' }));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.method).toBe('secret');
    }
  });

  it('rejects the dashboard secret in production unless explicitly allowed', async () => {
    process.env.DASHBOARD_ADMIN_SECRET = 'secret';
    process.env.PESKIDS_ENVIRONMENT = 'production';
    const { validateStaffRequest } = await import('../staff-auth');

    const result = await validateStaffRequest(makeRequest({ authorization: 'Bearer secret' }));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(401);
    }
  });

  it('accepts a staff supabase session with matching tenant and role', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'u1',
        email: 'support@peskids.com',
        user_metadata: { role: 'support', tenant_slug: 'peskids' },
        app_metadata: {},
      }),
    } as never);
    const { validateStaffRequest } = await import('../staff-auth');

    const result = await validateStaffRequest(makeRequest({ authorization: 'Bearer user-jwt' }));

    expect(result.ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://project.supabase.co/auth/v1/user',
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer user-jwt',
          apikey: 'service-role',
        }),
      })
    );
  });

  it('accepts a staff session from chunked Supabase SSR cookies', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'u1',
        email: 'admin@peskids.com',
        user_metadata: { role: 'admin', tenant_slug: 'peskids' },
        app_metadata: {},
      }),
    } as never);
    const { validateStaffRequest } = await import('../staff-auth');

    const result = await validateStaffRequest(
      makeRequest({}, chunkedAuthCookies('chunked-user-jwt'))
    );

    expect(result.ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://project.supabase.co/auth/v1/user',
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: 'Bearer chunked-user-jwt' }),
      })
    );
  });

  it('rejects a client session that does not have staff role', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'u1',
        email: 'family@example.com',
        user_metadata: { role: 'family', tenant_slug: 'peskids' },
        app_metadata: {},
      }),
    } as never);
    const { validateStaffRequest } = await import('../staff-auth');

    const result = await validateStaffRequest(makeRequest({ authorization: 'Bearer client-jwt' }));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });

  it('accepts the admin secret from cookies', async () => {
    process.env.DASHBOARD_ADMIN_SECRET = 'secret';
    cookieTokenValue = 'secret';
    const { validateStaffSession } = await import('../staff-auth');

    const result = await validateStaffSession();

    expect(result.ok).toBe(true);
  });
});
