import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import * as rateLimiter from '../../../../../../lib/rate-limiter';
import * as audit from '../../../../../../lib/audit';
import * as supabaseMod from '../../../../../../lib/supabase';
import * as portalTrusted from '../../../../../../lib/portal-trusted-identity';

vi.mock('../../../../../../lib/rate-limiter', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('../../../../../../lib/audit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../../../lib/audit')>();
  return {
    ...actual,
    logAuditEvent: vi.fn(),
    extractIp: vi.fn(),
  };
});

vi.mock('../../../../../../lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));

vi.mock('../../../../../../lib/portal-trusted-identity', () => ({
  resolveTrustedPortalSession: vi.fn(),
  PORTAL_READ_ROLES: ['owner', 'admin', 'operator', 'viewer'],
  PORTAL_WRITE_ROLES: ['owner', 'admin', 'operator'],
}));

vi.mock('../../../../../../lib/shield-metering', () => ({
  meterShieldApiCall: vi.fn(),
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

describe('POST /api/shield/alerts/config security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/test';
  });

  it('returns 429 when rate limit is exceeded', async () => {
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date(),
    });

    vi.mocked(audit.extractIp).mockReturnValue('1.2.3.4');

    vi.mocked(portalTrusted.resolveTrustedPortalSession).mockResolvedValue({
        ok: true,
        session: {
          user: { id: 'u1', email: 'owner@acme.com' } as any,
          tenant: tenantRow as any,
        },
      });

    vi.mocked(supabaseMod.getServiceClient).mockReturnValue({
      schema: () => ({
        from: () => ({
            upsert: () => ({
                select: () => ({
                    maybeSingle: () => Promise.resolve({ data: { id: 'x', enabled: true }, error: null })
                })
            })
         }),
      }),
    } as any);

    const req = new NextRequest('http://x/api/shield/alerts/config', {
      method: 'POST',
      headers: { authorization: 'Bearer x', 'content-type': 'application/json' },
      body: JSON.stringify({
        tenant_slug: 'acme',
        alert_type: 'phishing',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe('Too many requests');
    expect(rateLimiter.checkRateLimit).toHaveBeenCalledWith('shield-alert-config:1.2.3.4');
  });

  it('logs an audit event on successful configuration', async () => {
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetAt: new Date(),
    });

    vi.mocked(portalTrusted.resolveTrustedPortalSession).mockResolvedValue({
      ok: true,
      session: {
        user: { id: 'u1', email: 'owner@acme.com' } as any,
        tenant: tenantRow as any,
      },
    });

    const upsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'alert-123', enabled: true },
          error: null,
        }),
      }),
    });

    vi.mocked(supabaseMod.getServiceClient).mockReturnValue({
      schema: () => ({
        from: () => ({ upsert }),
      }),
    } as any);

    const req = new NextRequest('http://x/api/shield/alerts/config', {
      method: 'POST',
      headers: { authorization: 'Bearer x', 'content-type': 'application/json' },
      body: JSON.stringify({
        tenant_slug: 'acme',
        alert_type: 'phishing',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(audit.logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      tenant_slug: 'acme',
      action: 'UPSERT_SHIELD_CONFIG',
      resource: 'shield_alert_config:alert-123',
    }));
  });
});
