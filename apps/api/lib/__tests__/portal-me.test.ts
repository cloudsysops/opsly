import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchPortalTenantRowBySlug,
  parsePortalMode,
  parsePortalServices,
  portalUrlReachable,
  readPortalTenantSlugFromUser,
  resolvePortalServicesForTenant,
} from '../portal-me';
import * as redisCacheMod from '../redis-cache';
import * as supabaseMod from '../supabase';
import type { Json } from '../supabase/types';

vi.mock('../supabase', () => ({
  getServiceClient: vi.fn(),
}));

vi.mock('../redis-cache', () => ({
  getCache: vi.fn(),
  setCache: vi.fn(),
}));

describe('parsePortalServices', () => {
  it('returns nulls for null json', () => {
    const r = parsePortalServices(null);
    expect(r).toEqual({
      n8n_url: null,
      uptime_url: null,
      n8n_user: null,
      n8n_password: null,
    });
  });

  it('returns nulls for array json', () => {
    expect(parsePortalServices([] as Json)).toEqual({
      n8n_url: null,
      uptime_url: null,
      n8n_user: null,
      n8n_password: null,
    });
  });

  it('reads n8n and uptime_kuma aliases', () => {
    const r = parsePortalServices({
      n8n: 'https://n8n.example',
      uptime_kuma: 'https://up.example',
      n8n_basic_auth_user: 'u',
      n8n_basic_auth_password: 'p',
    });
    expect(r.n8n_url).toBe('https://n8n.example');
    expect(r.uptime_url).toBe('https://up.example');
    expect(r.n8n_user).toBe('u');
    expect(r.n8n_password).toBe('p');
  });

  it('accepts uptime key shorthand', () => {
    const r = parsePortalServices({
      n8n: 'https://n.example',
      uptime: 'https://u.example',
    });
    expect(r.uptime_url).toBe('https://u.example');
  });
});

describe('resolvePortalServicesForTenant', () => {
  it('uses canonical Peskids monitoring URLs regardless of stored services', () => {
    expect(
      resolvePortalServicesForTenant('peskids', {
        n8n: 'https://n8n.old.example',
        uptime: 'https://uptime.old.example',
        n8n_basic_auth_user: 'u',
        n8n_basic_auth_password: 'p',
      })
    ).toEqual({
      n8n_url: 'https://n8n-peskids.op-sly.com',
      uptime_url: 'https://uptime-peskids.op-sly.com',
      n8n_user: 'u',
      n8n_password: 'p',
    });
  });

  it('keeps generic tenants unchanged', () => {
    expect(
      resolvePortalServicesForTenant('acme', {
        n8n: 'https://n8n.acme',
        uptime: 'https://uptime.acme',
      })
    ).toEqual({
      n8n_url: 'https://n8n.acme',
      uptime_url: 'https://uptime.acme',
      n8n_user: null,
      n8n_password: null,
    });
  });
});

describe('parsePortalMode', () => {
  it('reads mode from meta', () => {
    expect(parsePortalMode({ mode: 'developer' })).toBe('developer');
    expect(parsePortalMode({ mode: 'managed' })).toBe('managed');
    expect(parsePortalMode({ mode: 'security_defense' })).toBe('security_defense');
  });

  it('reads portal_mode as alias', () => {
    expect(parsePortalMode({ portal_mode: 'managed' })).toBe('managed');
  });

  it('returns null for invalid mode', () => {
    expect(parsePortalMode({ mode: 'admin' })).toBe(null);
    expect(parsePortalMode(null)).toBe(null);
  });
});

describe('portalUrlReachable', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.mocked(redisCacheMod.getCache).mockResolvedValue(null);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is false for null url', async () => {
    await expect(portalUrlReachable(null)).resolves.toBe(false);
  });

  it('is false for empty url', async () => {
    await expect(portalUrlReachable('')).resolves.toBe(false);
  });

  it('is true when status is 200', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 200 }));
    await expect(portalUrlReachable('https://x')).resolves.toBe(true);
  });

  it('is false when status is beyond HTTP allowed range (simulated 600)', async () => {
    // Fetch Response constructor rejects status 600; runtime checks only `res.status`.
    vi.mocked(fetch).mockResolvedValueOnce({
      status: 600,
    } as Response);
    await expect(portalUrlReachable('https://x')).resolves.toBe(false);
  });

  it('is false when fetch throws', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network'));
    await expect(portalUrlReachable('https://x')).resolves.toBe(false);
  });

  it('returns cached value if present', async () => {
    vi.mocked(redisCacheMod.getCache).mockResolvedValueOnce(true);
    await expect(portalUrlReachable('https://cached')).resolves.toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('sets cache on success', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 200 }));
    await portalUrlReachable('https://new');
    expect(redisCacheMod.setCache).toHaveBeenCalledWith('reachable:https://new', true, expect.any(Number));
  });
});

describe('readPortalTenantSlugFromUser', () => {
  it('prefers user_metadata tenant_slug', () => {
    expect(
      readPortalTenantSlugFromUser({
        user_metadata: { tenant_slug: 'acme' },
        app_metadata: { tenant_slug: 'other' },
      })
    ).toBe('acme');
  });

  it('falls back to app_metadata', () => {
    expect(
      readPortalTenantSlugFromUser({
        app_metadata: { tenant_slug: 'beta' },
      })
    ).toBe('beta');
  });

  it('returns null when missing', () => {
    expect(readPortalTenantSlugFromUser({})).toBe(null);
  });
});

describe('fetchPortalTenantRowBySlug', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ok row when tenant exists', async () => {
    const row = {
      id: 'id-1',
      slug: 'acme',
      name: 'Acme',
      owner_email: 'o@a.com',
      plan: 'demo',
      status: 'active',
      services: {},
      created_at: '2026-01-01',
    };
    const chain = {
      schema: () => chain,
      from: () => chain,
      select: () => chain,
      eq: () => chain,
      is: () => chain,
      maybeSingle: () => Promise.resolve({ data: row, error: null }),
    };
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(
      chain as ReturnType<typeof supabaseMod.getServiceClient>
    );
    const r = await fetchPortalTenantRowBySlug('acme');
    expect(r).toEqual({ ok: true, row });
  });

  it('returns not_found when row missing', async () => {
    const chain = {
      schema: () => chain,
      from: () => chain,
      select: () => chain,
      eq: () => chain,
      is: () => chain,
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
    };
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(
      chain as ReturnType<typeof supabaseMod.getServiceClient>
    );
    const r = await fetchPortalTenantRowBySlug('missing');
    expect(r).toEqual({ ok: false, reason: 'not_found' });
  });

  it('returns db when Supabase error', async () => {
    const chain = {
      schema: () => chain,
      from: () => chain,
      select: () => chain,
      eq: () => chain,
      is: () => chain,
      maybeSingle: () => Promise.resolve({ data: null, error: { message: 'db' } }),
    };
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(
      chain as ReturnType<typeof supabaseMod.getServiceClient>
    );
    const r = await fetchPortalTenantRowBySlug('x');
    expect(r).toEqual({ ok: false, reason: 'db' });
  });
});
