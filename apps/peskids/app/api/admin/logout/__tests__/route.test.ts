import { describe, expect, it } from 'vitest';

describe('POST /api/admin/logout', () => {
  it('clears the admin-token cookie', async () => {
    const { POST } = await import('../route');

    const response = await POST();
    const nextResponse = response as Response & {
      cookies: { get: (name: string) => { maxAge?: number } | undefined };
    };

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(nextResponse.cookies.get('admin-token')?.maxAge).toBe(0);
  });
});
