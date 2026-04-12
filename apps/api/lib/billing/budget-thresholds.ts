/**
 * Umbrales de alerta para presupuestos mensuales en USD (sin wallet prepago).
 * Alineado a ADR-017: solo visualización / enforcement existente.
 */

export const BUDGET_PERCENT_WARNING = 75;
export const BUDGET_PERCENT_CRITICAL = 90;

export type BudgetAlertLevel = "ok" | "warning" | "critical";

export function budgetUsagePercent(used: number, limit: number): number {
  if (!Number.isFinite(used) || used < 0 || limit <= 0) {
    return 0;
  }
  return Math.min(100, (used / limit) * 100);
}

export function budgetAlertLevelFromPercent(percentage: number): BudgetAlertLevel {
  if (percentage >= BUDGET_PERCENT_CRITICAL) {
    return "critical";
  }
  if (percentage >= BUDGET_PERCENT_WARNING) {
    return "warning";
  }
  return "ok";
}

/**
 * Proyección lineal simple de gasto al cierre del mes UTC (orientativa).
 */
export function projectedMonthEndUsd(currentMonthSpend: number): number {
  const now = new Date();
  const day = now.getUTCDate();
  const lastDay = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0),
  ).getUTCDate();
  if (day <= 0 || lastDay <= 0) {
    return currentMonthSpend;
  }
  return (currentMonthSpend / day) * lastDay;
}
