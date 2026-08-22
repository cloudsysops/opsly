import { describe, expect, it, vi, beforeEach } from 'vitest';
import { respondPortalTenantHealth } from '../portal-health-json';
import * as redisCache from '../redis-cache';
import * as portalMe from '../portal-me';

vi.mock('../redis-cache', () => ({
  getCache: vi.fn(),
  setCache: vi.fn(() => Promise.resolve(true)),
}));

vi.mock('../portal-me', () => ({
  fetchPortalTenantRowBySlug: vi.fn(),
  portalUrlReachable: vi.fn(),
  resolvePortalServicesForTenant: vi.fn(),
}));

describe('respondPortalTenantHealth caching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns cached health response when cache hit occurs', async () => {
    const mockCachedPayload = {
      slug: 'acme',
      name: 'Acme Corp',
      plan: 'pro',
      status: 'active',
      services: { n8n_url: 'https://n8n.acme.com', uptime_url: 'https://status.acme.com' },
      health: {
        n8n_reachable: true,
        uptime_reachable: true,
        checked_at: '2026-08-22T12:00:00.000Z',
      },
    };

    vi.mocked(redisCache.getCache).mockResolvedValueOnce(mockCachedPayload);

    const res = await respondPortalTenantHealth('acme');
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(mockCachedPayload);
    expect(redisCache.getCache).toHaveBeenCalledWith('portal:tenant_health:acme');
    expect(portalMe.fetchPortalTenantRowBySlug).not.toHaveBeenCalled();
    expect(portalMe.portalUrlReachable).not.toHaveBeenCalled();
  });

  it('fetches tenant row and reachability probes on cache miss and writes to cache', async () => {
    vi.mocked(redisCache.getCache).mockResolvedValueOnce(null);
    vi.mocked(portalMe.fetchPortalTenantRowBySlug).mockResolvedValueOnce({
      ok: true,
      row: {
        id: 'tenant-123',
        slug: 'acme',
        name: 'Acme Corp',
        plan: 'pro',
        status: 'active',
        services: {},
      },
    });
    vi.mocked(portalMe.resolvePortalServicesForTenant).mockReturnValueOnce({
      n8n_url: 'https://n8n.acme.com',
      uptime_url: 'https://status.acme.com',
    } as ReturnType<typeof portalMe.resolvePortalServicesForTenant>);
    vi.mocked(portalMe.portalUrlReachable).mockResolvedValue(true);

    const res = await respondPortalTenantHealth('acme');
    const data = (await res.json()) as {
      slug: string;
      name: string;
      health: { n8n_reachable: boolean; uptime_reachable: boolean; checked_at: string };
    };

    expect(res.status).toBe(200);
    expect(data.slug).toBe('acme');
    expect(data.name).toBe('Acme Corp');
    expect(data.health.n8n_reachable).toBe(true);
    expect(data.health.uptime_reachable).toBe(true);

    expect(portalMe.fetchPortalTenantRowBySlug).toHaveBeenCalledWith('acme');
    expect(redisCache.setCache).toHaveBeenCalledWith(
      'portal:tenant_health:acme',
      expect.objectContaining({ slug: 'acme', name: 'Acme Corp' }),
      60
    );
  });
});
