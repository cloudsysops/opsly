import { resolveTrustedPortalSession } from './portal-trusted-identity';

export type TrustedFeedbackIdentity = {
  tenant_slug: string;
  user_email: string;
};

/**
 * Identidad para `POST /api/feedback` — delega en `resolveTrustedPortalSession`.
 */
export async function resolveTrustedFeedbackIdentity(
  request: Request
): Promise<{ ok: true; identity: TrustedFeedbackIdentity } | { ok: false; response: Response }> {
  const r = await resolveTrustedPortalSession(request);
  if (!r.ok) {
    return r;
  }
  const { tenant } = r.session;
  return {
    ok: true,
    identity: {
      tenant_slug: tenant.slug,
      user_email: tenant.owner_email,
    },
  };
}
