import { getServiceClient } from '../supabase';
import { loadModuleCatalog, type ModuleDefinition } from '../tenant-modules/catalog';

export type TenantModuleStatus =
  | 'not_installed'
  | 'queued'
  | 'provisioning'
  | 'active'
  | 'active_needs_manual_steps'
  | 'failed'
  | 'disabled';

export type TenantModuleView = ModuleDefinition & {
  status: TenantModuleStatus;
  last_error: string | null;
};

type TenantModuleRow = {
  module_id: string;
  status: TenantModuleStatus;
  last_error: string | null;
};

async function fetchTenantModuleRows(tenantSlug: string): Promise<TenantModuleRow[]> {
  const { data, error } = await getServiceClient()
    .schema('platform')
    .from('tenant_modules')
    .select('module_id, status, last_error')
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
    return {
      ...mod,
      status: row?.status ?? 'not_installed',
      last_error: row?.last_error ?? null,
    };
  });
}

const ACTIVE_LIKE_STATUSES: TenantModuleStatus[] = ['active', 'active_needs_manual_steps'];

export async function getMissingDependencies(
  tenantSlug: string,
  moduleId: string
): Promise<string[]> {
  const catalog = loadModuleCatalog();
  const mod = catalog[moduleId];
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
  status: TenantModuleStatus,
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
