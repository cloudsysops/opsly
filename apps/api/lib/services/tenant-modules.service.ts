import { z } from 'zod';
import { getServiceClient } from '../supabase';
import {
  getModuleDefinition,
  isModuleAutomatable,
  loadModuleCatalog,
  type ModuleDefinition,
} from '../tenant-modules/catalog';

export type TenantModuleStatus =
  | 'not_installed'
  | 'queued'
  | 'provisioning'
  | 'active'
  | 'active_needs_manual_steps'
  | 'failed'
  | 'disabled';

/**
 * Client-facing projection of a catalog module. Deliberately excludes
 * `bootstrap_script` / `smoke_script`: those are shell command strings and must
 * never leave the API process (they would otherwise ride along in the GET
 * /api/tenants/[slug]/modules payload).
 */
export type TenantModuleView = Omit<ModuleDefinition, 'bootstrap_script' | 'smoke_script'> & {
  automatable: boolean;
  status: TenantModuleStatus;
  last_error: string | null;
  /**
   * When the status last changed. Lets the admin detect a `queued`/`provisioning`
   * row abandoned by a dead API process and offer a retry.
   */
  updated_at: string | null;
};

/**
 * Statuses that can actually be persisted to `platform.tenant_modules.status`.
 * Excludes `not_installed`, which is a synthetic default `listTenantModules`
 * assigns when no DB row exists — the DB CHECK constraint
 * (supabase/migrations/0093_tenant_modules.sql) never allows that value.
 */
export type PersistedTenantModuleStatus = Exclude<TenantModuleStatus, 'not_installed'>;

type TenantModuleRow = {
  module_id: string;
  status: TenantModuleStatus;
  last_error: string | null;
  updated_at: string | null;
};

const uuidSchema = z.string().uuid();

/**
 * Resolves a tenant route ref (uuid OR slug) to the canonical, non-deleted
 * tenant slug. Mirrors the resolution in `app/api/tenants/[slug]/route.ts`.
 * Returns `null` when the tenant does not exist or is soft-deleted, so callers
 * can 404 instead of silently reading/writing `tenant_modules` rows keyed by an
 * unverified string.
 */
export async function resolveActiveTenantSlug(ref: string): Promise<string | null> {
  const byId = uuidSchema.safeParse(ref).success;
  const { data, error } = await getServiceClient()
    .schema('platform')
    .from('tenants')
    .select('slug')
    .is('deleted_at', null)
    .eq(byId ? 'id' : 'slug', ref)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve tenant: ${error.message}`);
  }
  const slug = (data as { slug?: unknown } | null)?.slug;
  return typeof slug === 'string' ? slug : null;
}

/**
 * Current persisted row for a (tenant, module) pair, or `null` when the module
 * has never been activated. Used by the activate route to enforce the
 * "no concurrent activation" precondition.
 */
export async function getTenantModuleRow(
  tenantSlug: string,
  moduleId: string
): Promise<{ status: PersistedTenantModuleStatus; updated_at: string | null } | null> {
  const { data, error } = await getServiceClient()
    .schema('platform')
    .from('tenant_modules')
    .select('status, updated_at')
    .eq('tenant_slug', tenantSlug)
    .eq('module_id', moduleId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load tenant_modules row: ${error.message}`);
  }
  if (!data) {
    return null;
  }
  const row = data as { status: PersistedTenantModuleStatus; updated_at: string | null };
  return { status: row.status, updated_at: row.updated_at ?? null };
}

async function fetchTenantModuleRows(tenantSlug: string): Promise<TenantModuleRow[]> {
  const { data, error } = await getServiceClient()
    .schema('platform')
    .from('tenant_modules')
    .select('module_id, status, last_error, updated_at')
    .eq('tenant_slug', tenantSlug);

  if (error) {
    throw new Error(`Failed to load tenant_modules: ${error.message}`);
  }
  return (data ?? []) as TenantModuleRow[];
}

export async function listTenantModules(tenantSlug: string): Promise<TenantModuleView[]> {
  const catalog = loadModuleCatalog();
  const rows = await fetchTenantModuleRows(tenantSlug);
  const rowsByModule = new Map(rows.map((r) => [r.module_id, r]));

  return Object.values(catalog).map((mod) => {
    const row = rowsByModule.get(mod.id);
    // Explicit field list (no `...mod` spread): `bootstrap_script` /
    // `smoke_script` must never reach the HTTP response.
    return {
      id: mod.id,
      name: mod.name,
      description: mod.description,
      category: mod.category,
      tier: mod.tier,
      required_by: mod.required_by,
      requires: mod.requires,
      manual_steps: mod.manual_steps,
      estimated_setup_minutes: mod.estimated_setup_minutes,
      cost_level: mod.cost_level,
      automatable: isModuleAutomatable(mod),
      status: row?.status ?? 'not_installed',
      last_error: row?.last_error ?? null,
      updated_at: row?.updated_at ?? null,
    };
  });
}

const ACTIVE_LIKE_STATUSES: TenantModuleStatus[] = ['active', 'active_needs_manual_steps'];

export async function getMissingDependencies(
  tenantSlug: string,
  moduleId: string
): Promise<string[]> {
  const mod = getModuleDefinition(moduleId);
  if (!mod || mod.requires.length === 0) {
    return [];
  }
  const rows = await fetchTenantModuleRows(tenantSlug);
  const rowsByModule = new Map(rows.map((r) => [r.module_id, r]));
  return mod.requires.filter((depId) => {
    const status = rowsByModule.get(depId)?.status ?? 'not_installed';
    return !ACTIVE_LIKE_STATUSES.includes(status);
  });
}

export async function upsertTenantModuleStatus(
  tenantSlug: string,
  moduleId: string,
  status: PersistedTenantModuleStatus,
  extra?: { last_error?: string | null; activated_at?: string | null }
): Promise<void> {
  const { error } = await getServiceClient()
    .schema('platform')
    .from('tenant_modules')
    .upsert(
      {
        tenant_slug: tenantSlug,
        module_id: moduleId,
        status,
        last_error: extra?.last_error ?? null,
        ...(extra?.activated_at !== undefined ? { activated_at: extra.activated_at } : {}),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_slug,module_id' }
    );

  if (error) {
    throw new Error(`Failed to upsert tenant_modules: ${error.message}`);
  }
}
