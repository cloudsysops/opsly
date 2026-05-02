import { reportMeteringEvent } from './billing/subscription-service';
import type { N8nCatalogItem } from './n8n-workflow-catalog-api';
import { findN8nCatalogItemById } from './n8n-workflow-catalog-api';
import { tenantPlanSupportsCatalogMin } from './n8n-marketplace-plan';
import { getServiceClient } from './supabase';

export const N8N_MARKETPLACE_PACK_METERING_TYPE = 'n8n_marketplace_pack_install' as const;

export type N8nMarketplaceInstallRow = {
  id: string;
  tenant_id: string;
  catalog_item_id: string;
  catalog_version: string;
  status: string;
  created_at: string;
  updated_at: string;
};

const INSTALL_SELECT =
  'id, tenant_id, catalog_item_id, catalog_version, status, created_at, updated_at' as const;

export async function listN8nMarketplaceInstallsForTenant(
  tenantId: string
): Promise<N8nMarketplaceInstallRow[]> {
  const db = getServiceClient();
  const { data, error } = await db
    .schema('platform')
    .from('n8n_marketplace_installs')
    .select(INSTALL_SELECT)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list marketplace installs: ${error.message}`);
  }
  return (data ?? []) as N8nMarketplaceInstallRow[];
}

export type ActivateN8nMarketplacePackResult =
  | { ok: true; already: boolean; install: N8nMarketplaceInstallRow }
  | { ok: false; reason: 'not_found' | 'plan_forbidden' | 'included_by_default' };

type CatalogGateOk = { pass: true; item: N8nCatalogItem };
type CatalogGateFail = { pass: false; result: ActivateN8nMarketplacePackResult };

function gateCatalogItemForActivation(
  item: N8nCatalogItem | null,
  tenantPlan: string
): CatalogGateOk | CatalogGateFail {
  if (!item) {
    return { pass: false, result: { ok: false, reason: 'not_found' } };
  }
  if (item.installed_by_default) {
    return { pass: false, result: { ok: false, reason: 'included_by_default' } };
  }
  if (!tenantPlanSupportsCatalogMin(tenantPlan, item.plan_min)) {
    return { pass: false, result: { ok: false, reason: 'plan_forbidden' } };
  }
  return { pass: true, item };
}

async function loadExistingInstallRow(
  tenantId: string,
  catalogItemId: string
): Promise<N8nMarketplaceInstallRow | null> {
  const db = getServiceClient();
  const { data, error } = await db
    .schema('platform')
    .from('n8n_marketplace_installs')
    .select(INSTALL_SELECT)
    .eq('tenant_id', tenantId)
    .eq('catalog_item_id', catalogItemId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read marketplace install: ${error.message}`);
  }
  return data as N8nMarketplaceInstallRow | null;
}

async function insertInstallAndReportMetering(
  tenantId: string,
  catalogItemId: string,
  item: N8nCatalogItem
): Promise<N8nMarketplaceInstallRow> {
  const db = getServiceClient();
  const { data: inserted, error: insertErr } = await db
    .schema('platform')
    .from('n8n_marketplace_installs')
    .insert({
      tenant_id: tenantId,
      catalog_item_id: catalogItemId,
      catalog_version: item.version,
      status: 'activated',
    })
    .select(INSTALL_SELECT)
    .single();

  if (insertErr || !inserted) {
    throw new Error(insertErr?.message ?? 'Failed to insert marketplace install');
  }

  const row = inserted as N8nMarketplaceInstallRow;

  try {
    await reportMeteringEvent(tenantId, {
      metric_type: N8N_MARKETPLACE_PACK_METERING_TYPE,
      quantity: 1,
      metadata: {
        catalog_item_id: catalogItemId,
        catalog_version: item.version,
        catalog_name: item.name,
      },
    });
  } catch (err) {
    await db.schema('platform').from('n8n_marketplace_installs').delete().eq('id', row.id);
    throw err instanceof Error ? err : new Error('Metering failed after install');
  }

  return row;
}

export async function activateN8nMarketplacePack(
  tenantId: string,
  tenantPlan: string,
  catalogItemId: string
): Promise<ActivateN8nMarketplacePackResult> {
  const gated = gateCatalogItemForActivation(findN8nCatalogItemById(catalogItemId), tenantPlan);
  if (!gated.pass) {
    return gated.result;
  }

  const existing = await loadExistingInstallRow(tenantId, catalogItemId);
  if (existing) {
    return { ok: true, already: true, install: existing };
  }

  const row = await insertInstallAndReportMetering(tenantId, catalogItemId, gated.item);
  return { ok: true, already: false, install: row };
}
