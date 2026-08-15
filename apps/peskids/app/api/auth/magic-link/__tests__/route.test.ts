import { beforeEach, describe, expect, it, vi } from 'vitest';

const generateLinkMock = vi.hoisted(() => vi.fn());

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      admin: {
        generateLink: generateLinkMock,
      },
    },
  }),
}));

describe('POST /api/auth/magic-link', () => {
  beforeEach(() => {
    generateLinkMock.mockReset();
    process.env.PESKIDS_INTERNAL_SECRET = 'internal-secret';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
    process.env.NEXT_PUBLIC_APP_URL = 'https://www.peskids.com';
  });

  it('rejects callers without the internal secret', async () => {
    const { POST } = await import('../route');
    const response = await POST({
      headers: new Headers({ 'x-request-id': 'req-magic-401' }),
      json: async () => ({ email: 'parent@example.com' }),
    } as never);

    expect(response.status).toBe(401);
    expect(generateLinkMock).not.toHaveBeenCalled();
  });

  it('rejects a mismatched internal secret', async () => {
    const { POST } = await import('../route');
    const response = await POST({
      headers: new Headers({
        'x-request-id': 'req-magic-401b',
        'x-internal-secret': 'wrong',
      }),
      json: async () => ({ email: 'parent@example.com' }),
    } as never);

    expect(response.status).toBe(401);
    expect(generateLinkMock).not.toHaveBeenCalled();
  });

  it('rate-limits a second magic link for the same email', async () => {
    generateLinkMock.mockResolvedValue({
      data: { properties: { action_link: 'https://auth.example/magic' } },
      error: null,
    });
    const { POST } = await import('../route');
    const email = `rate-${Date.now()}@example.com`;
    const headers = {
      'x-internal-secret': 'internal-secret',
    };

    const first = await POST({
      headers: new Headers({ ...headers, 'x-request-id': 'req-magic-ok' }),
      json: async () => ({ email }),
    } as never);
    expect(first.status).toBe(200);

    const second = await POST({
      headers: new Headers({ ...headers, 'x-request-id': 'req-magic-429' }),
      json: async () => ({ email }),
    } as never);
    expect(second.status).toBe(429);
  });

  it('returns the generated action link for an authorized caller', async () => {
    generateLinkMock.mockResolvedValue({
      data: { properties: { action_link: 'https://auth.example/magic' } },
      error: null,
    });
    const { POST } = await import('../route');
    const email = `ok-${Date.now()}@example.com`;

    const response = await POST({
      headers: new Headers({
        'x-request-id': 'req-magic-200',
        'x-internal-secret': 'internal-secret',
      }),
      json: async () => ({ email }),
    } as never);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      url: 'https://auth.example/magic',
      request_id: 'req-magic-200',
    });
  });
});
