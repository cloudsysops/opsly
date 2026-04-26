import { checkTenantBudget } from './billing/budget-enforcer';
import {
  budgetAlertLevelFromPercent,
  budgetUsagePercent,
  projectedMonthEndUsd,
} from './billing/budget-thresholds';
import type { BudgetAlertLevel } from './billing/budget-thresholds';
import { logger } from './logger';
import { getServiceClient } from './supabase';
import type { LlmBudgetSummary, TenantBudgetSnapshot } from './admin-costs-types';

export const MAX_TENANTS_BUDGET_OVERVIEW = 40;

type TenantRow = {
  id: unknown;
  slug: unknown;
  name: unknown;
};

function emptySummary(): LlmBudgetSummary {
  return {
    tenant_count: 0,
    tenants_at_warning: 0,
    tenants_at_critical: 0,
    total_spend_usd: 0,
  };
}

async function snapshotForTenant(row: TenantRow): Promise<TenantBudgetSnapshot | null> {
  const id = typeof row.id === 'string' ? row.id : '';
  const slug = typeof row.slug === 'string' ? row.slug : '';
  const name = typeof row.name === 'string' && row.name.trim().length > 0 ? row.name.trim() : slug;
  if (id.length === 0 || slug.length === 0) {
    return null;
  }
  try {
    const check = await checkTenantBudget(id);
    const pct = budgetUsagePercent(check.currentSpend, check.limit);
    const level: BudgetAlertLevel = budgetAlertLevelFromPercent(pct);
    return {
      tenant_slug: slug,
      tenant_name: name,
      current_spend_usd: check.currentSpend,
      limit_usd: check.limit,
      percent_used: pct,
      alert_level: level,
      enforcement_skipped: check.enforcementSkipped,
      projected_month_end_usd: projectedMonthEndUsd(check.currentSpend),
    };
  } catch (error) {
    logger.error('admin costs tenant budget check failed', {
      tenantId: id,
      tenantSlug: slug,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

function summarizeSnapshots(snapshots: TenantBudgetSnapshot[]): LlmBudgetSummary {
  let tenantsAtWarning = 0;
  let tenantsAtCritical = 0;
  let totalSpend = 0;
  for (const s of snapshots) {
    totalSpend += s.current_spend_usd;
    if (s.alert_level === 'warning') {
      tenantsAtWarning += 1;
    }
    if (s.alert_level === 'critical') {
      tenantsAtCritical += 1;
    }
  }
  return {
    tenant_count: snapshots.length,
    tenants_at_warning: tenantsAtWarning,
    tenants_at_critical: tenantsAtCritical,
    total_spend_usd: totalSpend,
  };
}

export async function fetchTenantBudgetOverview(): Promise<{
  tenant_budgets: TenantBudgetSnapshot[];
  llm_budget_summary: LlmBudgetSummary;
}> {
  try {
    const db = getServiceClient();
    const { data: rows, error } = await db
      .schema('platform')
      .from('tenants')
      .select('id, slug, name')
      .is('deleted_at', null)
      .order('slug', { ascending: true })
      .limit(MAX_TENANTS_BUDGET_OVERVIEW);

    if (error !== null) {
      logger.error('admin costs tenant list failed', { message: error.message });
      return { tenant_budgets: [], llm_budget_summary: emptySummary() };
    }
    if (rows === null || rows.length === 0) {
      return { tenant_budgets: [], llm_budget_summary: emptySummary() };
    }

    const results = await Promise.all((rows as TenantRow[]).map((row) => snapshotForTenant(row)));

    const snapshots: TenantBudgetSnapshot[] = [];
    for (const r of results) {
      if (r !== null) {
        snapshots.push(r);
      }
    }

    return {
      tenant_budgets: snapshots,
      llm_budget_summary: summarizeSnapshots(snapshots),
    };
  } catch (error) {
    logger.error(
      'admin costs payload build failed',
      error instanceof Error ? error : { error: String(error) }
    );
    return { tenant_budgets: [], llm_budget_summary: emptySummary() };
  }
}
