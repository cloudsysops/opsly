import type { PlanKey } from "../supabase/types";

/** Límite mensual por defecto (USD) cuando no hay fila en `tenant_budgets` ni plan reconocido. */
export const FREE_TIER_FALLBACK_MONTHLY_USD = 25;

/**
 * Defaults por `platform.tenants.plan` cuando no existe `platform.tenant_budgets`.
 * Ajustar según contrato comercial.
 */
export const DEFAULT_MONTHLY_BUDGET_USD_BY_PLAN: Record<PlanKey, number> = {
  startup: 50,
  business: 500,
  enterprise: 10_000,
  demo: 25,
};

/** Clave en `tenants.metadata`: la suspensión automática por presupuesto puede reactivarse sola al bajar el gasto. */
export const BUDGET_AUTO_SUSPEND_METADATA_KEY = "budget_auto_suspended" as const;

/** Ventana de deduplicación de jobs `check_budget` en Redis (ms). */
export const BUDGET_CHECK_DEDUP_WINDOW_MS = 30_000;

/**
 * Slugs que nunca entran en enforcement automático (lista en env, separada por comas).
 * Ej.: `ops,admin,smiletripcare`
 */
export function budgetEnforcementBypassSlugs(): Set<string> {
  const raw = process.env.BUDGET_ENFORCEMENT_BYPASS_SLUGS ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0),
  );
}
