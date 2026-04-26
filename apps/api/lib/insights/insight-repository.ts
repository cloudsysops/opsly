import { getServiceClient } from '../supabase/client.js';
import type { InsightStatus, InsightType, TenantInsightRow } from './types.js';

const DEDUP_FETCH_MULTIPLIER = 4;

export async function insertInsights(
  rows: Array<{
    tenant_id: string;
    insight_type: InsightType;
    title: string;
    summary: string;
    payload: Record<string, unknown>;
    confidence: number;
    impact_score: number;
  }>
): Promise<void> {
  if (rows.length === 0) {
    return;
  }
  const supabase = getServiceClient();
  const { error } = await supabase
    .schema('platform')
    .from('tenant_insights')
    .insert(
      rows.map((r) => ({
        tenant_id: r.tenant_id,
        insight_type: r.insight_type,
        title: r.title,
        summary: r.summary,
        payload: r.payload,
        confidence: r.confidence,
        impact_score: r.impact_score,
        status: 'active' as const,
      }))
    );
  if (error) {
    throw new Error(`tenant_insights insert: ${error.message}`);
  }
}

export async function listLatestInsightsForTenant(
  tenantId: string,
  limit: number
): Promise<TenantInsightRow[]> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .schema('platform')
    .from('tenant_insights')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit * DEDUP_FETCH_MULTIPLIER);

  if (error) {
    throw new Error(`tenant_insights list: ${error.message}`);
  }
  const rows = (data ?? []) as TenantInsightRow[];
  const seen = new Set<string>();
  const deduped: TenantInsightRow[] = [];
  for (const row of rows) {
    const key = row.insight_type;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(row);
    if (deduped.length >= limit) {
      break;
    }
  }
  return deduped.sort((a, b) => b.impact_score * b.confidence - a.impact_score * a.confidence);
}

export async function updateInsightStatus(params: {
  insightId: string;
  tenantId: string;
  status: InsightStatus;
  read?: boolean;
  actioned?: boolean;
}): Promise<void> {
  const supabase = getServiceClient();
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { status: params.status };
  if (params.read === true) {
    patch.read_at = now;
  }
  if (params.actioned === true) {
    patch.actioned_at = now;
  }
  const { error, count } = await supabase
    .schema('platform')
    .from('tenant_insights')
    .update(patch)
    .eq('id', params.insightId)
    .eq('tenant_id', params.tenantId);

  if (error) {
    throw new Error(`tenant_insights update: ${error.message}`);
  }
  if (count === 0) {
    const { data } = await supabase
      .schema('platform')
      .from('tenant_insights')
      .select('id')
      .eq('id', params.insightId)
      .eq('tenant_id', params.tenantId)
      .maybeSingle();
    if (!data) {
      throw new Error('Insight not found');
    }
  }
}
