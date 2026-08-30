import { beforeEach, describe, expect, it, vi } from 'vitest';
import { respondPortalTenantHealth, type PortalTenantHealthShape } from '../portal-health-json';
import * as portalMe from '../portal-me';
import * as redisCache from '../redis-cache';

vi.mock('../redis-cache', () => ({
  getCache: vi.fn(),
  setCache: vi.fn(() => Promise.resolve(true)),
}));

vi.mock('../portal-me', async () => {
  const actual = await vi.importActual<typeof import('../portal-me')>('../portal-me');
  return {
    ...actual,
    fetchPortalTenantRowBySlug: vi.fn(),
    portalUrlReachable: vi.fn(),
  };
});

describe('respondPortalTenantHealth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns cached health response immediately without querying DB or probing URLs when present in Redis', async () => {
    const cachedData: PortalTenantHealthShape = {
      slug: 'cached-tenant',
      name: 'Cached Tenant Inc',
      plan: 'pro',
      status: 'active',
      services: {
        n8n_url: 'https://n8n.example.com',
        uptime_url: 'https://status.example.com',
        openwa_api_url: null,
      },
      health: {
        n8n_reachable: true,
        uptime_reachable: true,
        checked_at: '2026-08-24T12:00:00.000Z',
      },
    };

    vi.mocked(redisCache.getCache).mockResolvedValue(cachedData);

    const response = await respondPortalTenantHealth('cached-tenant');
    const json = await response.json();

    expect(redisCache.getCache).toHaveBeenCalledWith('portal:tenant_health:cached-tenant');
    expect(portalMe.fetchPortalTenantRowBySlug).not.toHaveBeenCalled();
    expect(portalMe.portalUrlReachable).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(json).toEqual(cachedData);
  });

  it('fetches tenant row, probes URLs, and stores result in Redis when cache misses', async () => {
    vi.mocked(redisCache.getCache).mockResolvedValue(null);
    vi.mocked(portalMe.fetchPortalTenantRowBySlug).mockResolvedValue({
      ok: true,
      row: {
        slug: 'test-tenant',
        name: 'Test Tenant',
        plan: 'enterprise',
        status: 'active',
        services: {
          n8n_url: 'https://n8n.test.com',
          uptime_url: 'https://uptime.test.com',
        },
      },
    });
    vi.mocked(portalMe.portalUrlReachable).mockResolvedValue(true);

    const response = await respondPortalTenantHealth('test-tenant');
    const json = await response.json();

    expect(redisCache.getCache).toHaveBeenCalledWith('portal:tenant_health:test-tenant');
    expect(portalMe.fetchPortalTenantRowBySlug).toHaveBeenCalledWith('test-tenant');
    expect(portalMe.portalUrlReachable).toHaveBeenCalledTimes(2);
    expect(redisCache.setCache).toHaveBeenCalledWith(
      'portal:tenant_health:test-tenant',
      expect.objectContaining({
        slug: 'test-tenant',
        name: 'Test Tenant',
        health: expect.objectContaining({
          n8n_reachable: true,
          uptime_reachable: true,
        }),
      }),
      60
    );
    expect(response.status).toBe(200);
    expect(json.slug).toBe('test-tenant');
  });

  it('returns 404 when tenant lookup fails with not_found and does not set cache', async () => {
    vi.mocked(redisCache.getCache).mockResolvedValue(null);
    vi.mocked(portalMe.fetchPortalTenantRowBySlug).mockResolvedValue({
      ok: false,
      reason: 'not_found',
    });

    const response = await respondPortalTenantHealth('missing-tenant');
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json).toEqual({ error: 'Tenant not found' });
    expect(redisCache.setCache).not.toHaveBeenCalled();
  });

  it('returns 500 when tenant lookup fails with db error and does not set cache', async () => {
    vi.mocked(redisCache.getCache).mockResolvedValue(null);
    vi.mocked(portalMe.fetchPortalTenantRowBySlug).mockResolvedValue({
      ok: false,
      reason: 'db_error',
    });

    const response = await respondPortalTenantHealth('error-tenant');
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json).toEqual({ error: 'Database error' });
    expect(redisCache.setCache).not.toHaveBeenCalled();
  });
});
