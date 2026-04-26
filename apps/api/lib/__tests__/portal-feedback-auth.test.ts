import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveTrustedFeedbackIdentity } from '../portal-feedback-auth';
import * as portalAuth from '../portal-auth';
import * as portalMe from '../portal-me';

vi.mock('../portal-auth', () => ({
  getUserFromAuthorizationHeader: vi.fn(),
}));

vi.mock('../portal-me', async () => {
  const actual = await vi.importActual<typeof import('../portal-me')>('../portal-me');
  return {
    ...actual,
    fetchPortalTenantRowBySlug: vi.fn(),
  };
});

describe('resolveTrustedFeedbackIdentity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sin JWT → 401', async () => {
    vi.mocked(portalAuth.getUserFromAuthorizationHeader).mockResolvedValue(null);
    const res = await resolveTrustedFeedbackIdentity(
      new Request('http://localhost/api/feedback', { method: 'POST' })
    );
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('expected failure');
    expect(res.response.status).toBe(401);
  });

  it('usuario sin tenant_slug en metadata → 403', async () => {
    vi.mocked(portalAuth.getUserFromAuthorizationHeader).mockResolvedValue({
      email: 'a@b.com',
      user_metadata: {},
      app_metadata: {},
    } as never);
    const res = await resolveTrustedFeedbackIdentity(
      new Request('http://localhost/api/feedback', { method: 'POST' })
    );
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('expected failure');
    expect(res.response.status).toBe(403);
  });

  it('tenant inexistente en BD → 404', async () => {
    vi.mocked(portalAuth.getUserFromAuthorizationHeader).mockResolvedValue({
      email: 'owner@acme.com',
      user_metadata: { tenant_slug: 'acme' },
      app_metadata: {},
    } as never);
    vi.mocked(portalMe.fetchPortalTenantRowBySlug).mockResolvedValue({
      ok: false,
      reason: 'not_found',
    });
    const res = await resolveTrustedFeedbackIdentity(
      new Request('http://localhost/api/feedback', { method: 'POST' })
    );
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('expected failure');
    expect(res.response.status).toBe(404);
  });

  it('error DB al resolver tenant → 500', async () => {
    vi.mocked(portalAuth.getUserFromAuthorizationHeader).mockResolvedValue({
      email: 'owner@acme.com',
      user_metadata: { tenant_slug: 'acme' },
      app_metadata: {},
    } as never);
    vi.mocked(portalMe.fetchPortalTenantRowBySlug).mockResolvedValue({
      ok: false,
      reason: 'db',
    });
    const res = await resolveTrustedFeedbackIdentity(
      new Request('http://localhost/api/feedback', { method: 'POST' })
    );
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('expected failure');
    expect(res.response.status).toBe(500);
  });

  it('email JWT distinto a owner_email del tenant → 403', async () => {
    vi.mocked(portalAuth.getUserFromAuthorizationHeader).mockResolvedValue({
      email: 'intruso@evil.com',
      user_metadata: { tenant_slug: 'acme' },
      app_metadata: {},
    } as never);
    vi.mocked(portalMe.fetchPortalTenantRowBySlug).mockResolvedValue({
      ok: true,
      row: {
        id: 'uuid-1',
        slug: 'acme',
        name: 'Acme',
        owner_email: 'owner@acme.com',
        plan: 'startup',
        status: 'active',
        services: {},
        created_at: '2026-01-01',
      },
    });
    const res = await resolveTrustedFeedbackIdentity(
      new Request('http://localhost/api/feedback', { method: 'POST' })
    );
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('expected failure');
    expect(res.response.status).toBe(403);
  });

  it('identidad confiable: slug y email alineados con tenant', async () => {
    vi.mocked(portalAuth.getUserFromAuthorizationHeader).mockResolvedValue({
      email: 'owner@acme.com',
      user_metadata: { tenant_slug: 'acme' },
      app_metadata: {},
    } as never);
    vi.mocked(portalMe.fetchPortalTenantRowBySlug).mockResolvedValue({
      ok: true,
      row: {
        id: 'uuid-1',
        slug: 'acme',
        name: 'Acme',
        owner_email: 'owner@acme.com',
        plan: 'startup',
        status: 'active',
        services: {},
        created_at: '2026-01-01',
      },
    });
    const res = await resolveTrustedFeedbackIdentity(
      new Request('http://localhost/api/feedback', { method: 'POST' })
    );
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error('expected success');
    expect(res.identity.tenant_slug).toBe('acme');
    expect(res.identity.user_email).toBe('owner@acme.com');
  });
});
