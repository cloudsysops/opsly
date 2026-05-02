/**
 * Compara el plan del tenant con `plan_min` del catálogo marketplace n8n.
 * Acepta alias históricos (starter/pro) alineados a startup/business.
 */

const PLAN_RANK: Record<string, number> = {
  startup: 1,
  starter: 1,
  business: 2,
  pro: 2,
  enterprise: 3,
};

function planRank(plan: string): number | null {
  const key = plan.trim().toLowerCase();
  return PLAN_RANK[key] ?? null;
}

/**
 * @returns true si el plan del tenant cumple o supera el mínimo del ítem de catálogo.
 */
export function tenantPlanSupportsCatalogMin(tenantPlan: string, catalogPlanMin: string): boolean {
  const tenantR = planRank(tenantPlan);
  const minR = planRank(catalogPlanMin);
  if (minR === null) {
    return false;
  }
  if (tenantR === null) {
    return false;
  }
  return tenantR >= minR;
}
