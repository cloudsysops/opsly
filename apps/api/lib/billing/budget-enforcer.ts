import { BillingUsageRepository } from "../repositories/billing-usage-repository";
import { getServiceClient } from "../supabase";
import type { Json, PlanKey, TenantStatus } from "../supabase/types";
import { runWithTenantContext } from "../tenant-context";
import {
    BUDGET_AUTO_SUSPEND_METADATA_KEY,
    DEFAULT_MONTHLY_BUDGET_USD_BY_PLAN,
    FREE_TIER_FALLBACK_MONTHLY_USD,
    budgetEnforcementBypassSlugs,
} from "./budget-constants";

export type TenantBudgetCheckResult = {
  readonly isOverBudget: boolean;
  readonly currentSpend: number;
  readonly limit: number;
  /** Si true, no se debe suspender/reactivar automáticamente (bypass ops / metadata). */
  readonly enforcementSkipped: boolean;
  readonly tenantSlug: string;
  readonly tenantStatus: TenantStatus;
  readonly budgetAutoSuspended: boolean;
};

function startOfUtcMonthIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)).toISOString();
}

function isBudgetEnforcementDisabledInMetadata(metadata: Json): boolean {
  if (
    metadata === null ||
    typeof metadata !== "object" ||
    Array.isArray(metadata)
  ) {
    return false;
  }
  const v = (metadata as Record<string, unknown>).budget_enforcement_disabled;
  return v === true;
}

function readBudgetAutoSuspended(metadata: Json): boolean {
  if (
    metadata === null ||
    typeof metadata !== "object" ||
    Array.isArray(metadata)
  ) {
    return false;
  }
  return (metadata as Record<string, unknown>)[BUDGET_AUTO_SUSPEND_METADATA_KEY] === true;
}

async function fetchMonthlyCapFromTenantBudgets(
  slug: string,
): Promise<number | null> {
  const db = getServiceClient();
  const { data, error } = await db
    .schema("platform")
    .from("tenant_budgets")
    .select("monthly_cap_usd")
    .eq("tenant_slug", slug)
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  const cap = Number((data as { monthly_cap_usd: number }).monthly_cap_usd);
  return Number.isFinite(cap) && cap > 0 ? cap : null;
}

function resolveDefaultLimitForPlan(plan: PlanKey): number {
  return DEFAULT_MONTHLY_BUDGET_USD_BY_PLAN[plan] ?? FREE_TIER_FALLBACK_MONTHLY_USD;
}

async function resolveMonthlyLimitUsd(
  slug: string,
  plan: PlanKey,
): Promise<number> {
  const fromTable = await fetchMonthlyCapFromTenantBudgets(slug);
  if (fromTable !== null) {
    return fromTable;
  }
  return resolveDefaultLimitForPlan(plan);
}

/**
 * Evalúa gasto en `platform.billing_usage` (mes calendario UTC) frente al límite mensual.
 * El límite viene de `tenant_budgets.monthly_cap_usd` o del plan, con fallback {@link FREE_TIER_FALLBACK_MONTHLY_USD}.
 */
export async function checkTenantBudget(
  tenantId: string,
): Promise<TenantBudgetCheckResult> {
  const db = getServiceClient();
  const { data: tenant, error } = await db
    .schema("platform")
    .from("tenants")
    .select("id, slug, plan, status, metadata")
    .eq("id", tenantId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!tenant?.id || !tenant.slug) {
    throw new Error("Tenant not found");
  }

  const slug = tenant.slug as string;
  const plan = tenant.plan as PlanKey;
  const tenantStatus = tenant.status as TenantStatus;
  const metadata = tenant.metadata as Json;

  const bypassSlugs = budgetEnforcementBypassSlugs();
  const slugLower = slug.toLowerCase();
  const bypassBySlug = bypassSlugs.has(slugLower);
  const bypassByMeta = isBudgetEnforcementDisabledInMetadata(metadata);
  const enforcementSkipped = bypassBySlug || bypassByMeta;

  const limit = await resolveMonthlyLimitUsd(slug, plan);
  const monthStart = startOfUtcMonthIso();

  const { value: currentSpend, error: sumError } = await runWithTenantContext(
    { tenantId: tenant.id, tenantSlug: slug },
    async () => {
      const repo = new BillingUsageRepository();
      return repo.sumSettledTotalAmountSince(monthStart);
    },
  );

  if (sumError) {
    throw sumError;
  }

  const isOverBudget = currentSpend > limit;
  const budgetAutoSuspended = readBudgetAutoSuspended(metadata);

  return {
    isOverBudget,
    currentSpend,
    limit,
    enforcementSkipped,
    tenantSlug: slug,
    tenantStatus,
    budgetAutoSuspended,
  };
}
