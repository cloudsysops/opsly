import type { HermesTask } from '@intcloudsysops/types';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { TenantContext } from '../lib/tenant-context.js';
import { isTenantUuid } from '../metering/tenant-id.js';

/**
 * Resuelve `TenantContext` para una tarea Hermes (UUID en `tenant_id` + slug desde `platform.tenants`).
 * Si falta `tenant_id` válido, devuelve `null` (la tarea se procesa sin ALS — compat legado).
 */
export async function resolveHermesTenantContext(
  task: HermesTask,
  supabase: SupabaseClient
): Promise<TenantContext | null> {
  const tid = task.tenant_id?.trim();
  if (!tid || !isTenantUuid(tid)) {
    return null;
  }

  const { data, error } = await supabase
    .schema('platform')
    .from('tenants')
    .select('slug')
    .eq('id', tid)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    console.error('[hermes] resolve tenant slug:', error.message);
  }

  const slug =
    data && typeof data.slug === 'string' && data.slug.length > 0
      ? data.slug
      : (process.env.HERMES_FALLBACK_TENANT_SLUG?.trim() ?? 'platform');

  return { tenantId: tid.toLowerCase(), tenantSlug: slug };
}
