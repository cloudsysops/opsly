/* eslint-disable no-magic-numbers */
/**
 * Heurísticas locales (sin LLM): churn, forecast lineal simple, anomalía Z-score.
 * Coste O(n) sobre series ya agregadas en memoria.
 */

export type DailyCount = { date: string; count: number };

const MS_PER_DAY = 86_400_000;

export function daysBetween(isoA: string, isoB: string): number {
  const a = new Date(isoA).getTime();
  const b = new Date(isoB).getTime();
  return Math.abs(Math.round((b - a) / MS_PER_DAY));
}

/**
 * Riesgo de churn: sin actividad reciente en usage_events (proxy de engagement).
 */
export function churnRiskFromLastUsage(params: {
  lastUsageAt: string | null;
  nowIso: string;
  inactiveDaysThreshold: number;
}): { risk: number; daysSince: number } | null {
  if (params.lastUsageAt === null) {
    return { risk: 0.85, daysSince: 999 };
  }
  const daysSince = daysBetween(params.lastUsageAt, params.nowIso);
  if (daysSince < params.inactiveDaysThreshold) {
    return null;
  }
  const capped = Math.min(daysSince, 60);
  const risk = Math.min(0.95, 0.45 + (capped - params.inactiveDaysThreshold) * 0.012);
  return { risk, daysSince };
}

/**
 * Regresión lineal y = a + b x sobre los últimos puntos (x = 0..n-1).
 */
export function linearForecastNext(
  dailyTotals: number[]
): { slope: number; intercept: number; next: number } | null {
  const n = dailyTotals.length;
  if (n < 3) {
    return null;
  }
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  for (let i = 0; i < n; i += 1) {
    const x = i;
    const y = dailyTotals[i] ?? 0;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) {
    return null;
  }
  const b = (n * sumXY - sumX * sumY) / denom;
  const a = (sumY - b * sumX) / n;
  const next = Math.max(0, a + b * n);
  return { slope: b, intercept: a, next };
}

/**
 * Z-score del último valor vs media/std de la ventana previa (sin el último punto).
 */
export function zScoreAnomaly(
  series: number[]
): { z: number; mean: number; std: number; last: number } | null {
  if (series.length < 8) {
    return null;
  }
  const last = series[series.length - 1] ?? 0;
  const rest = series.slice(0, -1);
  const mean = rest.reduce((s, x) => s + x, 0) / rest.length;
  const variance = rest.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(1, rest.length - 1);
  const std = Math.sqrt(Math.max(variance, 1e-9));
  const z = (last - mean) / std;
  return { z, mean, std, last };
}
