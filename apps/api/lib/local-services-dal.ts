import { HTTP_STATUS } from './constants';
import { resolveTrustedPortalSession, tenantSlugMatchesSession } from './portal-trusted-identity';
import { runWithTenantContext } from './tenant-context';

/**
 * Portal JWT + path slug must match session tenant; then runs `fn` inside `runWithTenantContext`.
 * Use for Local Services API routes under `/api/local-services/tenants/[slug]/...`.
 */
export async function runLocalServicesTenantDal<T>(
  request: Request,
  pathSlug: string,
  fn: () => T | Promise<T>
): Promise<T | Response> {
  const resolved = await resolveTrustedPortalSession(request);
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
  return runWithTenantContext({ tenantId: id, tenantSlug: slug }, fn);
}
