/**
 * Resuelve UUID de tenant para claves Redis `usage:{uuid}:…`.
 * Prioriza `hintTenantId` si es UUID válido; si no, consulta `platform.tenants` por slug.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getSupabaseForLookup(): SupabaseClient | null {
  if (supabase) {
    return supabase;
  }
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return null;
  }
  supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return supabase;
}

export function isTenantUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

export async function resolveTenantUuid(
  tenantSlug: string,
  hintTenantId?: string
): Promise<string | null> {
  if (hintTenantId && isTenantUuid(hintTenantId)) {
    return hintTenantId.trim().toLowerCase();
  }
  const sb = getSupabaseForLookup();
  if (!sb) {
    console.error('[orchestrator-meter] Supabase no configurado: no se puede resolver tenant UUID');
    return null;
  }
  const { data, error } = await sb
    .schema('platform')
    .from('tenants')
    .select('id')
    .eq('slug', tenantSlug)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    console.error('[orchestrator-meter] lookup tenant id:', error.message);
    return null;
  }
  if (!data || typeof data.id !== 'string' || !isTenantUuid(data.id)) {
    return null;
  }
  return data.id;
}
