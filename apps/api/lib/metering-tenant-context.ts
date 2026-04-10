import { getServiceClient } from "./supabase";
import { runWithTenantContext, tryGetTenantContext } from "./tenant-context";

/**
 * Resuelve `id` + `slug` en DB y ejecuta `fn` dentro de ALS (workers sin request HTTP).
 */
export async function runWithResolvedTenantContext<T>(
  tenantSlug: string,
  fn: () => T | Promise<T>,
): Promise<T> {
  const { data, error } = await getServiceClient()
    .schema("platform")
    .from("tenants")
    .select("id, slug")
    .eq("slug", tenantSlug)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(`metering tenant lookup: ${error.message}`);
  }
  if (!data?.id || !data.slug) {
    throw new Error(`metering: tenant not found for slug ${tenantSlug}`);
  }

  return runWithTenantContext(
    { tenantId: data.id, tenantSlug: data.slug },
    fn,
  );
}

/**
 * Ejecuta `fn` con contexto de tenant:
 * - Si ALS ya coincide con `tenantSlug`, no hace query.
 * - Si se pasa `tenantId` y coincide con el contexto actual, reutiliza.
 * - Si no, resuelve por slug en DB.
 */
export async function runWithMeteringTenantContext<T>(
  tenantSlug: string,
  fn: () => T | Promise<T>,
  options?: { tenantId?: string },
): Promise<T> {
  const current = tryGetTenantContext();
  if (current?.tenantSlug === tenantSlug) {
    if (options?.tenantId && options.tenantId !== current.tenantId) {
      throw new Error("metering: tenantId no coincide con el contexto ALS");
    }
    return fn();
  }

  if (options?.tenantId) {
    return runWithTenantContext(
      { tenantId: options.tenantId, tenantSlug },
      fn,
    );
  }

  return runWithResolvedTenantContext(tenantSlug, fn);
}
