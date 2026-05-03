import { HTTP_STATUS } from './constants';
import {
  PORTAL_READ_ROLES,
  resolveTrustedPortalSession,
  tenantSlugMatchesSession,
  type TrustedPortalSession,
  type TrustedPortalSessionOptions,
} from './portal-trusted-identity';
import { runWithTenantContext } from './tenant-context';

export const PORTAL_READ_ACCESS: TrustedPortalSessionOptions = {
  allowedRoles: PORTAL_READ_ROLES,
};

/**
 * Integración DAL + rutas API (Node runtime): envuelve el handler tras resolver la sesión portal
 * y fija el contexto de tenant en `AsyncLocalStorage`.
 *
 * **No usar en `middleware.ts` de Next.js Edge:** ALS no cruza el boundary Edge y el runtime
 * no es Node completo. Llama este helper desde el route handler (`app/api/.../route.ts`).
 */
export async function runTrustedPortalDal<T>(
  request: Request,
  fn: (session: TrustedPortalSession) => T | Promise<T>,
  options?: TrustedPortalSessionOptions
): Promise<T | Response> {
  const resolved = await resolveTrustedPortalSession(request, options);
  if (!resolved.ok) {
    return resolved.response;
  }
  const { id, slug } = resolved.session.tenant;
  return runWithTenantContext({ tenantId: id, tenantSlug: slug }, () => fn(resolved.session));
}

/**
 * Igual que `runTrustedPortalDal`, pero exige que `pathSlug` coincida con el tenant del JWT
 * (`tenantSlugMatchesSession`) antes de fijar el ALS. Para rutas `app/api/portal/tenant/[slug]/*`.
 */
export async function runTrustedPortalDalForPathSlug<T>(
  request: Request,
  pathSlug: string,
  fn: (session: TrustedPortalSession) => T | Promise<T>,
  options?: TrustedPortalSessionOptions
): Promise<T | Response> {
  const resolved = await resolveTrustedPortalSession(request, options);
  if (!resolved.ok) {
    return resolved.response;
  }
  if (!tenantSlugMatchesSession(resolved.session, pathSlug)) {
    return Response.json(
      { error: 'Tenant slug does not match session' },
      { status: HTTP_STATUS.FORBIDDEN }
    );
  }
  const { id, slug } = resolved.session.tenant;
  return runWithTenantContext({ tenantId: id, tenantSlug: slug }, () => fn(resolved.session));
}
