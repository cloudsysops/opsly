import { logger } from '../logger';
import { getServiceClient } from '../supabase';
import {
  SHIELD_SCORE_HISTORY_DEFAULT_LIMIT,
  SHIELD_SECRETS_LIST_DEFAULT_LIMIT,
} from '../shield-constants';

export type ShieldSecretFindingRow = {
  id: string;
  tenant_slug: string;
  repo_url: string | null;
  secret_type: string | null;
  file_path: string | null;
  line_number: number | null;
  severity: string;
  status: string;
  created_at: string;
};

export type ShieldScoreHistoryRow = {
  id: string;
  tenant_slug: string;
  score: number | null;
  breakdown: Record<string, unknown> | null;
  created_at: string;
};

export async function listShieldSecretFindings(
  tenantSlug: string,
  opts?: { status?: string; limit?: number }
): Promise<ShieldSecretFindingRow[]> {
  const db = getServiceClient();
  let q = db
    .schema('platform')
    .from('shield_secret_findings')
    .select(
      'id, tenant_slug, repo_url, secret_type, file_path, line_number, severity, status, created_at'
    )
    .eq('tenant_slug', tenantSlug)
    .order('created_at', { ascending: false });

  if (opts?.status !== undefined && opts.status.length > 0) {
    q = q.eq('status', opts.status);
  }
  const limit = opts?.limit ?? SHIELD_SECRETS_LIST_DEFAULT_LIMIT;
  q = q.limit(limit);

  const { data, error } = await q;
  if (error !== null) {
    logger.error('shield listShieldSecretFindings', error);
    return [];
  }
  return (data ?? []) as ShieldSecretFindingRow[];
}

export async function insertShieldSecretFindings(
  rows: Array<{
    tenant_slug: string;
    repo_url?: string | null;
    secret_type?: string | null;
    file_path?: string | null;
    line_number?: number | null;
    severity?: string;
    status?: string;
  }>
): Promise<number> {
  if (rows.length === 0) {
    return 0;
  }
  const db = getServiceClient();
  const { data, error } = await db
    .schema('platform')
    .from('shield_secret_findings')
    .insert(rows)
    .select('id');
  if (error !== null) {
    logger.error('shield insertShieldSecretFindings', error);
    return 0;
  }
  return Array.isArray(data) ? data.length : 0;
}

export async function listShieldScoreHistory(
  tenantSlug: string,
  opts?: { sinceIso?: string; limit?: number }
): Promise<ShieldScoreHistoryRow[]> {
  const db = getServiceClient();
  let q = db
    .schema('platform')
    .from('shield_score_history')
    .select('id, tenant_slug, score, breakdown, created_at')
    .eq('tenant_slug', tenantSlug)
    .order('created_at', { ascending: false });

  if (opts?.sinceIso !== undefined) {
    q = q.gte('created_at', opts.sinceIso);
  }
  q = q.limit(opts?.limit ?? SHIELD_SCORE_HISTORY_DEFAULT_LIMIT);

  const { data, error } = await q;
  if (error !== null) {
    logger.error('shield listShieldScoreHistory', error);
    return [];
  }
  return (data ?? []) as ShieldScoreHistoryRow[];
}

export async function insertShieldScoreHistory(params: {
  tenant_slug: string;
  score: number;
  breakdown: Record<string, unknown>;
}): Promise<ShieldScoreHistoryRow | null> {
  const db = getServiceClient();
  const { data, error } = await db
    .schema('platform')
    .from('shield_score_history')
    .insert({
      tenant_slug: params.tenant_slug,
      score: params.score,
      breakdown: params.breakdown,
    })
    .select('id, tenant_slug, score, breakdown, created_at')
    .maybeSingle();

  if (error !== null) {
    logger.error('shield insertShieldScoreHistory', error);
    return null;
  }
  return data as ShieldScoreHistoryRow | null;
}
