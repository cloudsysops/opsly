import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as marketplaceSvc from '../../../../../../../lib/n8n-marketplace-installs-service';
import {
  resolveTrustedPortalSession,
  tenantSlugMatchesSession,
  type TrustedPortalSession,
} from '../../../../../../../lib/portal-trusted-identity';
import { GET as marketplaceInstallsGet, POST as marketplaceInstallsPost } from './route';

vi.mock('../../../../../../../lib/portal-trusted-identity', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../../../../../lib/portal-trusted-identity')>();
  return {
    ...actual,
    resolveTrustedPortalSession: vi.fn(),
    tenantSlugMatchesSession: vi.fn(),
  };
});

vi.mock('../../../../../../../lib/n8n-marketplace-installs-service', () => ({
  listN8nMarketplaceInstallsForTenant: vi.fn(),
  countN8nMarketplaceMeteringThisMonth: vi.fn(),
  activateN8nMarketplacePack: vi.fn(),
}));

const mockSession = vi.mocked(resolveTrustedPortalSession);
const mockSlugMatch = vi.mocked(tenantSlugMatchesSession);

const sessionTenant: TrustedPortalSession['tenant'] = {
  id: 'tid-1',
  slug: 'acme',
  name: 'Acme',
  owner_email: 'o@acme.com',
  plan: 'business',
  status: 'active',
  services: { n8n: 'https://n8n.test' },
  created_at: '2026-01-01',
};

function okAuth(): void {
  mockSession.mockResolvedValue({
    ok: true,
    session: {
      user: { id: 'u1', email: 'o@acme.com' } as TrustedPortalSession['user'],
      tenant: sessionTenant,
    },
  });
  mockSlugMatch.mockReturnValue(true);
}

describe('/api/portal/tenant/[slug]/n8n-marketplace/installs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('returns 401 when session resolution fails', async () => {
      mockSession.mockResolvedValue({
        ok: false,
        response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
      });
      const res = await marketplaceInstallsGet(
        new NextRequest('http://localhost/api/portal/tenant/acme/n8n-marketplace/installs'),
        { params: Promise.resolve({ slug: 'acme' }) }
      );
      expect(res.status).toBe(401);
    });

    it('returns 403 when slug does not match session tenant', async () => {
      okAuth();
      mockSlugMatch.mockReturnValue(false);
      const res = await marketplaceInstallsGet(
        new NextRequest('http://localhost/api/portal/tenant/other/n8n-marketplace/installs', {
          headers: { authorization: 'Bearer t' },
        }),
        { params: Promise.resolve({ slug: 'other' }) }
      );
      expect(res.status).toBe(403);
    });

    it('returns 200 with installs and metering', async () => {
      okAuth();
      vi.mocked(marketplaceSvc.listN8nMarketplaceInstallsForTenant).mockResolvedValue([
        {
          id: 'i1',
          tenant_id: 'tid-1',
          catalog_item_id: 'crm-starter-pack',
          catalog_version: '1.0.0',
          status: 'activated',
          created_at: '2026-05-01T00:00:00Z',
          updated_at: '2026-05-01T00:00:00Z',
        },
      ]);
      vi.mocked(marketplaceSvc.countN8nMarketplaceMeteringThisMonth).mockResolvedValue(2);
      const res = await marketplaceInstallsGet(
        new NextRequest('http://localhost/api/portal/tenant/acme/n8n-marketplace/installs', {
          headers: { authorization: 'Bearer t' },
        }),
        { params: Promise.resolve({ slug: 'acme' }) }
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.tenant).toBe('acme');
      expect(Array.isArray(body.installs)).toBe(true);
      expect((body.installs as unknown[]).length).toBe(1);
      expect(body.billing_usage).toEqual({ pack_metering_events_this_month: 2 });
    });
  });

  describe('POST', () => {
    beforeEach(() => {
      okAuth();
    });

    it('returns 400 when catalog_item_id missing', async () => {
      const res = await marketplaceInstallsPost(
        new NextRequest('http://localhost/api/portal/tenant/acme/n8n-marketplace/installs', {
          method: 'POST',
          headers: { authorization: 'Bearer t', 'content-type': 'application/json' },
          body: JSON.stringify({}),
        }),
        { params: Promise.resolve({ slug: 'acme' }) }
      );
      expect(res.status).toBe(400);
    });

    it('returns 403 when plan forbids pack', async () => {
      vi.mocked(marketplaceSvc.activateN8nMarketplacePack).mockResolvedValue({
        ok: false,
        reason: 'plan_forbidden',
      });
      const res = await marketplaceInstallsPost(
        new NextRequest('http://localhost/api/portal/tenant/acme/n8n-marketplace/installs', {
          method: 'POST',
          headers: { authorization: 'Bearer t', 'content-type': 'application/json' },
          body: JSON.stringify({ catalog_item_id: 'premium-pack' }),
        }),
        { params: Promise.resolve({ slug: 'acme' }) }
      );
      expect(res.status).toBe(403);
    });

    it('returns 422 when pack is included by default', async () => {
      vi.mocked(marketplaceSvc.activateN8nMarketplacePack).mockResolvedValue({
        ok: false,
        reason: 'included_by_default',
      });
      const res = await marketplaceInstallsPost(
        new NextRequest('http://localhost/api/portal/tenant/acme/n8n-marketplace/installs', {
          method: 'POST',
          headers: { authorization: 'Bearer t', 'content-type': 'application/json' },
          body: JSON.stringify({ catalog_item_id: 'crm-starter-pack' }),
        }),
        { params: Promise.resolve({ slug: 'acme' }) }
      );
      expect(res.status).toBe(422);
    });

    it('returns 200 when activation succeeds', async () => {
      vi.mocked(marketplaceSvc.activateN8nMarketplacePack).mockResolvedValue({
        ok: true,
        already: false,
        install: {
          id: 'i1',
          tenant_id: 'tid-1',
          catalog_item_id: 'custom-pack',
          catalog_version: '1.0.0',
          status: 'activated',
          created_at: '2026-05-03T00:00:00Z',
          updated_at: '2026-05-03T00:00:00Z',
        },
      });
      const res = await marketplaceInstallsPost(
        new NextRequest('http://localhost/api/portal/tenant/acme/n8n-marketplace/installs', {
          method: 'POST',
          headers: { authorization: 'Bearer t', 'content-type': 'application/json' },
          body: JSON.stringify({ catalog_item_id: 'custom-pack' }),
        }),
        { params: Promise.resolve({ slug: 'acme' }) }
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.ok).toBe(true);
      expect(body.already).toBe(false);
    });
  });
});
