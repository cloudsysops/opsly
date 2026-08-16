import type { SupabaseClient } from '@supabase/supabase-js';
import {
  TenantNotFoundError,
  type EntitlementSource,
  type GrantEntitlementInput,
  type TenantEntitlement,
} from './types.js';

/**
 * Deliberately untyped against any app's generated `Database` — every app
 * has its own, and this module only ever touches the shared `platform`
 * schema, so the client's own type parameter doesn't matter here.
 */
export type PlatformSupabaseClient = SupabaseClient;

async function resolveTenantId(
  supabase: PlatformSupabaseClient,
  tenantSlug: string
): Promise<string> {
  const { data, error } = await supabase
    .schema('platform')
    .from('tenants')
    .select('id')
    .eq('slug', tenantSlug)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw new Error(`Failed to resolve tenant "${tenantSlug}": ${error.message}`);
  if (!data) throw new TenantNotFoundError(tenantSlug);
  return (data as { id: string }).id;
}

/** Whether an enabled entitlement exists for this tenant + module. Fails closed on any error. */
export async function checkEntitlement(
  supabase: PlatformSupabaseClient,
  tenantSlug: string,
  moduleId: string
): Promise<boolean> {
  try {
    const tenantId = await resolveTenantId(supabase, tenantSlug);
    const { data, error } = await supabase
      .schema('platform')
      .from('tenant_entitlements')
      .select('enabled')
      .eq('tenant_id', tenantId)
      .eq('module_id', moduleId)
      .maybeSingle();

    if (error) return false;
    return Boolean((data as { enabled?: boolean } | null)?.enabled);
  } catch {
    return false;
  }
}

export async function listEntitlements(
  supabase: PlatformSupabaseClient,
  tenantSlug: string
): Promise<TenantEntitlement[]> {
  const tenantId = await resolveTenantId(supabase, tenantSlug);
  const { data, error } = await supabase
    .schema('platform')
    .from('tenant_entitlements')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('module_id', { ascending: true });

  if (error) throw new Error(`Failed to list entitlements for "${tenantSlug}": ${error.message}`);
  return (data ?? []) as TenantEntitlement[];
}

export async function grantEntitlement(
  supabase: PlatformSupabaseClient,
  tenantSlug: string,
  input: GrantEntitlementInput
): Promise<TenantEntitlement> {
  const tenantId = await resolveTenantId(supabase, tenantSlug);
  const source: EntitlementSource = input.source ?? 'manual';

  const { data, error } = await supabase
    .schema('platform')
    .from('tenant_entitlements')
    .upsert(
      {
        tenant_id: tenantId,
        module_id: input.moduleId,
        enabled: true,
        source,
        granted_by: input.grantedBy ?? null,
        metadata: input.metadata ?? {},
      },
      { onConflict: 'tenant_id,module_id' }
    )
    .select('*')
    .single();

  if (error) throw new Error(`Failed to grant "${input.moduleId}" to "${tenantSlug}": ${error.message}`);
  return data as TenantEntitlement;
}

export async function revokeEntitlement(
  supabase: PlatformSupabaseClient,
  tenantSlug: string,
  moduleId: string
): Promise<void> {
  const tenantId = await resolveTenantId(supabase, tenantSlug);
  const { error } = await supabase
    .schema('platform')
    .from('tenant_entitlements')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('module_id', moduleId);

  if (error) throw new Error(`Failed to revoke "${moduleId}" from "${tenantSlug}": ${error.message}`);
}
