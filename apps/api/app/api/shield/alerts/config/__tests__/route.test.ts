import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../route';
import * as portalTrusted from '../../../../../../lib/portal-trusted-identity';
import * as supabaseMod from '../../../../../../lib/supabase';

vi.mock('../../../../../../lib/portal-trusted-identity', () => ({
  resolveTrustedPortalSession: vi.fn(),
}));

vi.mock('../../../../../../lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));

const tenantRow = {
  id: 't-1',
  slug: 'acme',
  name: 'Acme',
  owner_email: 'owner@acme.com',
  plan: 'startup',
  status: 'active',
  services: {},
  created_at: '2026-01-01',
};

describe('POST /api/shield/alerts/config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/test';
  });

  it('returns 401 when session fails', async () => {
    vi.mocked(portalTrusted.resolveTrustedPortalSession).mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    });
    const req = new NextRequest('http://x/api/shield/alerts/config', {
      method: 'POST',
      headers: { authorization: 'Bearer x', 'content-type': 'application/json' },
      body: JSON.stringify({
        tenant_slug: 'acme',
        alert_type: 'phishing',
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 403 when tenant_slug mismatches session', async () => {
    vi.mocked(portalTrusted.resolveTrustedPortalSession).mockResolvedValue({
      ok: true,
      session: {
        user: { id: 'u1', email: 'owner@acme.com' } as never,
        tenant: tenantRow as never,
      },
    });
    const req = new NextRequest('http://x/api/shield/alerts/config', {
      method: 'POST',
      headers: { authorization: 'Bearer x', 'content-type': 'application/json' },
      body: JSON.stringify({
        tenant_slug: 'other',
        alert_type: 'phishing',
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('returns 422 when no webhook available', async () => {
    delete process.env.DISCORD_WEBHOOK_URL;
    delete process.env.SHIELD_ALERTS_DISCORD_WEBHOOK_URL;
    vi.mocked(portalTrusted.resolveTrustedPortalSession).mockResolvedValue({
      ok: true,
      session: {
        user: { id: 'u1', email: 'owner@acme.com' } as never,
        tenant: tenantRow as never,
      },
    });
    const req = new NextRequest('http://x/api/shield/alerts/config', {
      method: 'POST',
      headers: { authorization: 'Bearer x', 'content-type': 'application/json' },
      body: JSON.stringify({
        tenant_slug: 'acme',
        alert_type: 'dominio_falso',
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  it('returns 200 with alert_id and webhook on upsert success', async () => {
    vi.mocked(portalTrusted.resolveTrustedPortalSession).mockResolvedValue({
      ok: true,
      session: {
        user: { id: 'u1', email: 'owner@acme.com' } as never,
        tenant: tenantRow as never,
      },
    });

    const upsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: '550e8400-e29b-41d4-a716-446655440000', enabled: true },
          error: null,
        }),
      }),
    });

    vi.mocked(supabaseMod.getServiceClient).mockReturnValue({
      schema: () => ({
        from: () => ({ upsert }),
      }),
    } as never);

    const req = new NextRequest('http://x/api/shield/alerts/config', {
      method: 'POST',
      headers: { authorization: 'Bearer x', 'content-type': 'application/json' },
      body: JSON.stringify({
        tenant_slug: 'acme',
        alert_type: 'endpoint_caido',
        threshold: { response_time: 5000 },
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.alert_id).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(body.status).toBe('active');
    expect(body.webhook_url).toBe('https://discord.com/api/webhooks/test');
    expect(upsert).toHaveBeenCalled();
  });
});
