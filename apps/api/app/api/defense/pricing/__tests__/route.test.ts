import { describe, expect, it, vi } from 'vitest';
import { GET } from '../route';
import { requireAdminAccessUnlessDemoRead } from '../../../../../lib/auth';
import { DEFENSE_PLANS } from '../../../../../lib/defense/pricing';

vi.mock('../../../../../lib/auth', () => ({
  requireAdminAccessUnlessDemoRead: vi.fn(),
}));

describe('GET /api/defense/pricing', () => {
  it('returns auth response when authentication fails', async () => {
    const authResponse = new Response('Unauthorized', { status: 401 });
    vi.mocked(requireAdminAccessUnlessDemoRead).mockResolvedValue(authResponse);

    const req = new Request('http://localhost/api/defense/pricing');
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it('returns defense plans with private HTTP Cache-Control headers when authorized', async () => {
    vi.mocked(requireAdminAccessUnlessDemoRead).mockResolvedValue(null);

    const req = new Request('http://localhost/api/defense/pricing');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    expect(res.headers.get('cache-control')).toBe(
      'private, max-age=3600, stale-while-revalidate=86400'
    );

    const body = await res.json();
    expect(body).toEqual({ plans: DEFENSE_PLANS });
  });
});
