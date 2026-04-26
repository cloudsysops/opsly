import type { BillingMetricType } from './billing/types';

/**
 * Precios unitarios por defecto para medición (sin secretos).
 * Ajustar según contrato/plan; multiplicadores por modelo en `aiModelCostMultiplier`.
 */
export const BILLING_METER_UNIT_COST_USD = {
  /** Coste por token (input+output agregado) antes de multiplicador de modelo */
  AI_TOKEN: 0.0001,
  /** Coste por segundo de CPU / worker */
  CPU_SECOND: 0.000_01,
  /** Almacenamiento (placeholder; ajustar por GB/mes) */
  STORAGE_GB: 0.001,
} as const;

/** Coste unitario USD por tipo de métrica (`platform.billing_usage`). */
export function unitCostUsdForMetric(metric: BillingMetricType): number {
  switch (metric) {
    case 'ai_tokens':
      return BILLING_METER_UNIT_COST_USD.AI_TOKEN;
    case 'cpu_seconds':
    case 'worker_seconds':
      return BILLING_METER_UNIT_COST_USD.CPU_SECOND;
    case 'storage_gb':
      return BILLING_METER_UNIT_COST_USD.STORAGE_GB;
  }
}

const AI_MULT_TIER_PREMIUM = 10;
const AI_MULT_TIER_LOW = 1;
const AI_MULT_TIER_MID = 3;
const AI_MULT_TIER_DEFAULT = 2;

/**
 * Factor multiplicador sobre `BILLING_METER_UNIT_COST_USD.AI_TOKEN` según el modelo declarado.
 */
export function aiModelCostMultiplier(modelName: string): number {
  const m = modelName.toLowerCase();
  if (m.includes('gpt-4') || m.includes('opus')) {
    return AI_MULT_TIER_PREMIUM;
  }
  if (m.includes('gpt-3.5') || m.includes('haiku') || m.includes('3.5')) {
    return AI_MULT_TIER_LOW;
  }
  if (m.includes('sonnet') || m.includes('gpt-4o-mini')) {
    return AI_MULT_TIER_MID;
  }
  return AI_MULT_TIER_DEFAULT;
}
