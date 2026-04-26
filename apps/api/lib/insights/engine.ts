/* eslint-disable no-magic-numbers, max-lines-per-function */
import { getServiceClient } from '../supabase/client';
import type { PlanKey, TenantStatus } from '../supabase/types';
import { churnRiskFromLastUsage, linearForecastNext, zScoreAnomaly } from './heuristics';
import type {
  InsightPayloadAnomaly,
  InsightPayloadChurn,
  InsightPayloadForecast,
  InsightStatus,
  InsightType,
  TenantInsightRow,
} from './types';

export type { InsightType, TenantInsightRow } from './types';

const WINDOW_DAYS = 90;
const CHURN_INACTIVE_DAYS = 7;
const ANOMALY_Z_THRESHOLD = 2.5;

type DailyAgg = { date: string; count: number; costUsd: number };

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startIso(days: number): string {
  const t = Date.now() - days * 86_400_000;
  return new Date(t).toISOString();
}

/**
 * Agrega usage_events por día (últimos `days`). Solo datos del tenant (tenant_slug).
 */
export async function fetchUsageDailySeries(tenantSlug: string, days: number): Promise<DailyAgg[]> {
  const db = getServiceClient();
  const { data, error } = await db
    .schema('platform')
    .from('usage_events')
    .select('created_at, cost_usd')
    .eq('tenant_slug', tenantSlug)
    .gte('created_at', startIso(days));

  if (error) {
    throw new Error(`usage_events: ${error.message}`);
  }
  const rows = data ?? [];
  const map = new Map<string, DailyAgg>();
  for (const row of rows) {
    const created = row.created_at as string;
    const day = isoDate(new Date(created));
    const cost = Number(row.cost_usd ?? 0);
    const cur = map.get(day) ?? { date: day, count: 0, costUsd: 0 };
    cur.count += 1;
    cur.costUsd += cost;
    map.set(day, cur);
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

async function fetchLastUsageAt(tenantSlug: string): Promise<string | null> {
  const db = getServiceClient();
  const { data, error } = await db
    .schema('platform')
    .from('usage_events')
    .select('created_at')
    .eq('tenant_slug', tenantSlug)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`usage_events last: ${error.message}`);
  }
  if (!data?.created_at) {
    return null;
  }
  return data.created_at as string;
}

function buildChurnRow(params: {
  tenantId: string;
  slug: string;
  plan: PlanKey;
  status: TenantStatus;
  lastUsageAt: string | null;
  nowIso: string;
}): Omit<TenantInsightRow, 'id' | 'created_at' | 'read_at' | 'actioned_at'> | null {
  if (params.status !== 'active') {
    return null;
  }
  const churn = churnRiskFromLastUsage({
    lastUsageAt: params.lastUsageAt,
    nowIso: params.nowIso,
    inactiveDaysThreshold: CHURN_INACTIVE_DAYS,
  });
  if (churn === null) {
    return null;
  }
  const payload: InsightPayloadChurn = {
    days_since_last_usage: churn.daysSince,
    last_usage_at: params.lastUsageAt,
    window_days: WINDOW_DAYS,
  };
  const confidence = Math.min(0.95, churn.risk);
  const impact = Math.round(churn.risk * 100);
  return {
    tenant_id: params.tenantId,
    insight_type: 'churn_risk',
    title: 'Riesgo de desinterés en uso de IA',
    summary:
      `Sin actividad de uso LLM reciente (${churn.daysSince} días). ` +
      `Plan ${params.plan}. Revisa workflows o contacta al equipo.`,
    payload: payload as unknown as Record<string, unknown>,
    confidence,
    impact_score: impact,
    status: 'active',
  };
}

function buildForecastRow(params: {
  tenantId: string;
  daily: DailyAgg[];
}): Omit<TenantInsightRow, 'id' | 'created_at' | 'read_at' | 'actioned_at'> | null {
  const costs = params.daily.map((d) => d.costUsd);
  const forecast = linearForecastNext(costs);
  if (forecast === null) {
    return null;
  }
  const observedAvg = costs.reduce((s, x) => s + x, 0) / Math.max(1, costs.length);
  const next7 = forecast.next * 7;
  const payload: InsightPayloadForecast = {
    currency: 'USD',
    observed_daily_avg_usd: Math.round(observedAvg * 10000) / 10000,
    forecast_next_7d_usd: Math.round(next7 * 10000) / 10000,
    series_days: costs.length,
  };
  const growth = observedAvg > 0 ? (forecast.next - observedAvg) / observedAvg : 0;
  if (Math.abs(growth) < 0.07) {
    return null;
  }
  const up = growth > 0;
  const confidence = Math.min(0.9, 0.55 + Math.min(0.35, Math.abs(growth)));
  const impact = Math.round(Math.min(100, Math.abs(growth) * 200));
  return {
    tenant_id: params.tenantId,
    insight_type: 'revenue_forecast',
    title: up ? 'Tendencia al alza en gasto IA' : 'Tendencia a la baja en gasto IA',
    summary:
      `Basado en ${params.daily.length} días con datos: promedio diario ~$${payload.observed_daily_avg_usd.toFixed(2)} USD; ` +
      `proyección lineal próximos 7 días ~$${payload.forecast_next_7d_usd.toFixed(2)} USD (coste acumulado).`,
    payload: payload as unknown as Record<string, unknown>,
    confidence,
    impact_score: impact,
    status: 'active',
  };
}

function buildAnomalyRow(params: {
  tenantId: string;
  daily: DailyAgg[];
}): Omit<TenantInsightRow, 'id' | 'created_at' | 'read_at' | 'actioned_at'> | null {
  const counts = params.daily.map((d) => d.count);
  const z = zScoreAnomaly(counts);
  if (z === null || Math.abs(z.z) < ANOMALY_Z_THRESHOLD) {
    return null;
  }
  const payload: InsightPayloadAnomaly = {
    metric: 'usage_events_daily_count',
    last_day_count: z.last,
    baseline_mean: Math.round(z.mean * 100) / 100,
    baseline_std: Math.round(z.std * 100) / 100,
    z_score: Math.round(z.z * 100) / 100,
    window_days: counts.length,
  };
  const severity = Math.abs(z.z) >= 3.5 ? 'pico extremo' : 'pico inusual';
  const confidence = Math.min(0.92, 0.5 + Math.min(0.42, Math.abs(z.z) / 10));
  const impact = Math.round(Math.min(100, Math.abs(z.z) * 18));
  return {
    tenant_id: params.tenantId,
    insight_type: 'usage_anomaly',
    title: `Anomalía en volumen de uso (${severity})`,
    summary:
      `El último día registró ${z.last} eventos frente a media ~${z.mean.toFixed(1)} ` +
      `(Z=${z.z.toFixed(2)}). Revisa picos de tráfico o jobs duplicados.`,
    payload: payload as unknown as Record<string, unknown>,
    confidence,
    impact_score: impact,
    status: 'active',
  };
}

async function deleteActiveInsightsForTypes(tenantId: string, types: InsightType[]): Promise<void> {
  if (types.length === 0) {
    return;
  }
  const db = getServiceClient();
  const { error } = await db
    .schema('platform')
    .from('tenant_insights')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .in('insight_type', types);

  if (error) {
    throw new Error(`tenant_insights delete: ${error.message}`);
  }
}

async function insertInsightRows(
  rows: Array<{
    tenant_id: string;
    insight_type: InsightType;
    title: string;
    summary: string;
    payload: Record<string, unknown>;
    confidence: number;
    impact_score: number;
    status: InsightStatus;
  }>
): Promise<void> {
  if (rows.length === 0) {
    return;
  }
  const db = getServiceClient();
  const { error } = await db.schema('platform').from('tenant_insights').insert(rows);
  if (error) {
    throw new Error(`tenant_insights insert: ${error.message}`);
  }
}

/**
 * Regenera insights heurísticos para un tenant (aislamiento estricto por slug / tenant_id).
 */
export async function generateInsightsForTenant(params: {
  tenantId: string;
  slug: string;
  plan: PlanKey;
  status: TenantStatus;
}): Promise<{ inserted: number }> {
  const nowIso = new Date().toISOString();
  const daily = await fetchUsageDailySeries(params.slug, WINDOW_DAYS);
  const lastUsage = await fetchLastUsageAt(params.slug);

  const types: InsightType[] = ['churn_risk', 'revenue_forecast', 'usage_anomaly'];
  await deleteActiveInsightsForTypes(params.tenantId, types);

  const rows: Array<{
    tenant_id: string;
    insight_type: InsightType;
    title: string;
    summary: string;
    payload: Record<string, unknown>;
    confidence: number;
    impact_score: number;
    status: InsightStatus;
  }> = [];

  const churn = buildChurnRow({
    tenantId: params.tenantId,
    slug: params.slug,
    plan: params.plan,
    status: params.status,
    lastUsageAt: lastUsage,
    nowIso,
  });
  if (churn !== null) {
    rows.push({
      tenant_id: churn.tenant_id,
      insight_type: churn.insight_type,
      title: churn.title,
      summary: churn.summary,
      payload: churn.payload,
      confidence: churn.confidence,
      impact_score: churn.impact_score,
      status: churn.status,
    });
  }

  const forecast = buildForecastRow({ tenantId: params.tenantId, daily });
  if (forecast !== null) {
    rows.push({
      tenant_id: forecast.tenant_id,
      insight_type: forecast.insight_type,
      title: forecast.title,
      summary: forecast.summary,
      payload: forecast.payload,
      confidence: forecast.confidence,
      impact_score: forecast.impact_score,
      status: forecast.status,
    });
  }

  const anomaly = buildAnomalyRow({ tenantId: params.tenantId, daily });
  if (anomaly !== null) {
    rows.push({
      tenant_id: anomaly.tenant_id,
      insight_type: anomaly.insight_type,
      title: anomaly.title,
      summary: anomaly.summary,
      payload: anomaly.payload,
      confidence: anomaly.confidence,
      impact_score: anomaly.impact_score,
      status: anomaly.status,
    });
  }

  await insertInsightRows(rows);
  return { inserted: rows.length };
}

/**
 * Procesa todos los tenants activos (batch simple; escalar con cola BullMQ / chunks).
 */
export async function generateInsightsForAllActiveTenants(): Promise<{
  tenants: number;
  totalInserted: number;
}> {
  const db = getServiceClient();
  const { data, error } = await db
    .schema('platform')
    .from('tenants')
    .select('id, slug, plan, status')
    .eq('status', 'active');

  if (error) {
    throw new Error(`tenants list: ${error.message}`);
  }
  const list = data ?? [];
  let totalInserted = 0;
  for (const t of list) {
    const r = await generateInsightsForTenant({
      tenantId: t.id as string,
      slug: t.slug as string,
      plan: (t.plan as PlanKey) ?? 'startup',
      status: t.status as TenantStatus,
    });
    totalInserted += r.inserted;
  }
  return { tenants: list.length, totalInserted };
}

export async function getInsightsForTenant(
  tenantId: string,
  options: { includeRead?: boolean; limit?: number } = {}
): Promise<TenantInsightRow[]> {
  const limit = options.limit ?? 24;
  const includeRead = options.includeRead ?? false;
  const db = getServiceClient();
  let q = db
    .schema('platform')
    .from('tenant_insights')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!includeRead) {
    q = q.is('read_at', null);
  }

  const { data, error } = await q;
  if (error) {
    throw new Error(`tenant_insights list: ${error.message}`);
  }
  const rows = (data ?? []) as TenantInsightRow[];
  return rows.sort((a, b) => b.impact_score * b.confidence - a.impact_score * a.confidence);
}

export async function markInsightRead(insightId: string, tenantId: string): Promise<void> {
  const db = getServiceClient();
  const now = new Date().toISOString();
  const { data, error } = await db
    .schema('platform')
    .from('tenant_insights')
    .update({ read_at: now })
    .eq('id', insightId)
    .eq('tenant_id', tenantId)
    .select('id')
    .maybeSingle();

  if (error) {
    throw new Error(`mark read: ${error.message}`);
  }
  if (!data) {
    throw new Error('Insight not found');
  }
}

export async function markInsightStatus(params: {
  insightId: string;
  tenantId: string;
  status: InsightStatus;
}): Promise<void> {
  const db = getServiceClient();
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { status: params.status };
  if (params.status === 'actioned') {
    patch.actioned_at = now;
    patch.read_at = now;
  }
  if (params.status === 'dismissed') {
    patch.read_at = now;
  }
  const { data, error } = await db
    .schema('platform')
    .from('tenant_insights')
    .update(patch)
    .eq('id', params.insightId)
    .eq('tenant_id', params.tenantId)
    .select('id')
    .maybeSingle();

  if (error) {
    throw new Error(`mark status: ${error.message}`);
  }
  if (!data) {
    throw new Error('Insight not found');
  }
}
