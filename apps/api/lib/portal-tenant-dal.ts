import { resolveTrustedPortalSession } from "./portal-trusted-identity";
import { runWithTenantContext } from "./tenant-context";

/**
 * Integración DAL + rutas API (Node runtime): envuelve el handler tras resolver la sesión portal
 * y fija el contexto de tenant en `AsyncLocalStorage`.
 *
 * **No usar en `middleware.ts` de Next.js Edge:** ALS no cruza el boundary Edge y el runtime
 * no es Node completo. Llama este helper desde el route handler (`app/api/.../route.ts`).
 */
export async function runTrustedPortalDal<T>(
  request: Request,
  fn: () => T | Promise<T>,
): Promise<T | Response> {
  const resolved = await resolveTrustedPortalSession(request);
  if (!resolved.ok) {
    return resolved.response;
  }
  const { id, slug } = resolved.session.tenant;
  return runWithTenantContext({ tenantId: id, tenantSlug: slug }, fn);
}
