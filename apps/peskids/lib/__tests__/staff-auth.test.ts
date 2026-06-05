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
        return [];
      },
    },
  } as never;
}

describe('validateStaffRequest', () => {
  beforeEach(() => {
    cookieTokenValue = '';
    cookieStore.getAll.mockClear();
    delete process.env.DASHBOARD_ADMIN_SECRET;
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
