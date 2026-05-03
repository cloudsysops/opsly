import { describe, expect, it, vi } from 'vitest';
import { runLocalServicesTenantDal } from '../local-services-dal';
import * as portalTrusted from '../portal-trusted-identity';

vi.mock('../portal-trusted-identity', () => ({
  resolveTrustedPortalSession: vi.fn(),
  tenantSlugMatchesSession: vi.fn(),
}));

describe('runLocalServicesTenantDal', () => {
  it('returns 403 when path slug does not match session tenant', async () => {
    vi.mocked(portalTrusted.resolveTrustedPortalSession).mockResolvedValue({
      ok: true,
      session: {
        user: {} as never,
        tenant: { id: 't1', slug: 'acme' } as never,
      },
    });
    vi.mocked(portalTrusted.tenantSlugMatchesSession).mockReturnValue(false);

    const result = await runLocalServicesTenantDal(
      new Request('http://x', { headers: { authorization: 'Bearer x' } }),
      'other',
      () => 'should-not-run'
    );
    expect(result).toBeInstanceOf(Response);
    const res = result as Response;
    expect(res.status).toBe(403);
  });

  it('runs fn when slug matches', async () => {
    vi.mocked(portalTrusted.resolveTrustedPortalSession).mockResolvedValue({
      ok: true,
      session: {
        user: {} as never,
        tenant: { id: 't1', slug: 'acme' } as never,
      },
    });
    vi.mocked(portalTrusted.tenantSlugMatchesSession).mockReturnValue(true);

    const result = await runLocalServicesTenantDal(
      new Request('http://x', { headers: { authorization: 'Bearer x' } }),
      'acme',
      () => 'ok'
    );
    expect(result).toBe('ok');
  });
});
