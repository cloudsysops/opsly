/** Agregación pura para analytics de coste LLM (`platform.usage_events`). */

const PERIOD_RE = /^(\d{4})-(\d{1,2})$/;
const RX_MATCH_YEAR = 1;
const RX_MATCH_MONTH = 2;
const CAL_MONTH_MIN = 1;
const CAL_MONTH_MAX = 12;
const PCT_FULL = 100;
/** `Date.UTC` mes 0-based vs mes civil 1..12 */
const MONTH_TO_JS_INDEX = 1;
const ONE_EVENT = 1;

export function parsePeriodToUtcRange(period: string): { start: string; end: string } | null {
  const m = PERIOD_RE.exec(period.trim());
  if (!m) {
    return null;
  }
  const y = Number(m[RX_MATCH_YEAR]);
  const mo = Number(m[RX_MATCH_MONTH]);
  if (mo < CAL_MONTH_MIN || mo > CAL_MONTH_MAX || !Number.isFinite(y)) {
    return null;
  }
  const start = new Date(Date.UTC(y, mo - MONTH_TO_JS_INDEX, CAL_MONTH_MIN));
  const end = new Date(Date.UTC(y, mo, CAL_MONTH_MIN));
  return { start: start.toISOString(), end: end.toISOString() };
}

export type RawUsageAnalyticsRow = {
  model: string | null;
  cost_usd: number | string | null;
  tokens_input: number | null;
  tokens_output: number | null;
  feature: string | null;
};

function num(v: number | string | null | undefined): number {
  if (v === null || v === undefined) {
    return 0;
  }
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export type ModelAggregate = {
  model: string;
  requests: number;
  cost_usd: number;
  tokens_input: number;
  tokens_output: number;
  pct_of_cost: number;
};

export type FeatureAggregate = {
  feature: string;
  requests: number;
  cost_usd: number;
  pct_of_cost: number;
};

export function aggregateLlmCostsByModel(rows: RawUsageAnalyticsRow[]): ModelAggregate[] {
  const byModel = new Map<string, { requests: number; cost: number; tin: number; tout: number }>();
  for (const row of rows) {
    const model = row.model?.length ? row.model : 'unknown';
    const cur = byModel.get(model) ?? { requests: 0, cost: 0, tin: 0, tout: 0 };
    cur.requests += ONE_EVENT;
    cur.cost += num(row.cost_usd);
    cur.tin += row.tokens_input ?? 0;
    cur.tout += row.tokens_output ?? 0;
    byModel.set(model, cur);
  }
  const totalCost = [...byModel.values()].reduce((s, v) => s + v.cost, 0);
  return [...byModel.entries()]
    .map(([model, v]) => ({
      model,
      requests: v.requests,
      cost_usd: v.cost,
      tokens_input: v.tin,
      tokens_output: v.tout,
      pct_of_cost: totalCost > 0 ? (v.cost / totalCost) * PCT_FULL : 0,
    }))
    .sort((a, b) => b.cost_usd - a.cost_usd);
}

export function aggregateLlmCostsByFeature(rows: RawUsageAnalyticsRow[]): FeatureAggregate[] {
  const byFeat = new Map<string, { requests: number; cost: number }>();
  for (const row of rows) {
    const feature = row.feature?.length ? row.feature : 'unknown';
    const cur = byFeat.get(feature) ?? { requests: 0, cost: 0 };
    cur.requests += ONE_EVENT;
    cur.cost += num(row.cost_usd);
    byFeat.set(feature, cur);
  }
  const totalCost = [...byFeat.values()].reduce((s, v) => s + v.cost, 0);
  return [...byFeat.entries()]
    .map(([feature, v]) => ({
      feature,
      requests: v.requests,
      cost_usd: v.cost,
      pct_of_cost: totalCost > 0 ? (v.cost / totalCost) * PCT_FULL : 0,
    }))
    .sort((a, b) => b.cost_usd - a.cost_usd);
}
