import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';

vi.mock('../../../../../lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));

vi.mock('../../../../../lib/portal-auth', () => ({
  getUserFromAuthorizationHeader: vi.fn(),
}));

import { getUserFromAuthorizationHeader } from '../../../../../lib/portal-auth';
import { getServiceClient } from '../../../../../lib/supabase';

const superAdminUser = {
  id: 'admin-1',
  app_metadata: { is_superuser: true },
  user_metadata: {},
};

describe('GET /api/admin/tenants', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUserFromAuthorizationHeader).mockResolvedValue(superAdminUser as never);
    vi.mocked(getServiceClient).mockReturnValue({
      rpc: vi.fn().mockResolvedValue({
        data: {
          total: 1,
          items: [
            {
              id: 't1',
              slug: 'acme',
              name: 'Acme',
              owner_email: 'o@acme.com',
              plan: 'startup',
              status: 'active',
              spend_month_usd: 12.34,
            },
          ],
        },
        error: null,
      }),
    } as never);
  });

  it('returns 403 for non-super-admin', async () => {
    vi.mocked(getUserFromAuthorizationHeader).mockResolvedValue({
      id: 'u',
      user_metadata: {},
      app_metadata: {},
    } as never);
    const res = await GET(
      new Request('http://localhost/api/admin/tenants', {
        headers: { Authorization: 'Bearer x' },
      })
    );
    expect(res.status).toBe(403);
  });

  it('returns paginated tenants', async () => {
    const res = await GET(
      new Request('http://localhost/api/admin/tenants?limit=10&offset=0', {
        headers: { Authorization: 'Bearer tok' },
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      total: number;
      tenants: Array<{ slug: string }>;
      limit: number;
      offset: number;
    };
    expect(body.total).toBe(1);
    expect(body.tenants[0]?.slug).toBe('acme');
    expect(body.limit).toBe(10);
    expect(body.offset).toBe(0);
  });
});
