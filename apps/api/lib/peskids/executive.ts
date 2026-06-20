import { getServiceClient } from '../supabase';
import { logger } from '../logger';
import { PESKIDS_PIPELINE_STAGES, type PeskidsPipelineStage } from './ghl-contract';
import { getCache, setCache } from '../redis-cache';
import { CACHE_TTL } from '../constants';

type PlatformLeadRow = {
  lead_id: string | null;
  source: string | null;
  stage: string | null;
  status: string | null;
  referral_source: string | null;
  created_at: string;
};

type ExecutiveAlert = {
  key: string;
  label: string;
  count: number;
  detail: string;
};

export type PeskidsExecutiveStageCount = {
  stage: PeskidsPipelineStage;
  count: number;
};

export type PeskidsExecutiveMetrics = {
  new_leads: number;
  converted_leads: number;
  conversion_rate_pct: number | null;
  active_students: number;
  revenue_cents: number;
  pending_payments_cents: number;
  alerts: number;
};

export type PeskidsExecutiveSummary = {
  tenant_slug: string;
  generated_at: string;
  metrics: PeskidsExecutiveMetrics;
  pipeline_stages: PeskidsExecutiveStageCount[];
  lead_sources: Record<'instagram' | 'facebook' | 'website' | 'referral' | 'other', number>;
  alerts: ExecutiveAlert[];
};

function isMissingPlatformLeadColumns(error: { message?: string } | null): boolean {
  const message = error?.message?.toLowerCase() ?? '';
  return (
    message.includes('platform.peskids_leads') ||
    message.includes('column "lead_id" does not exist') ||
    message.includes('column "stage" does not exist') ||
    message.includes('column "source" does not exist') ||
    message.includes('column "referral_source" does not exist') ||
    message.includes('schema cache') ||
    message.includes('does not exist')
  );
}

function isLeadStage(value: string | null | undefined): value is PeskidsPipelineStage {
  return PESKIDS_PIPELINE_STAGES.includes((value ?? '') as PeskidsPipelineStage);
}

function normalizeLeadStage(row: PlatformLeadRow): PeskidsPipelineStage | null {
  if (isLeadStage(row.stage)) {
    return row.stage;
  }

  switch ((row.status ?? '').toLowerCase()) {
    case 'contacted':
      return 'Contacted';
    case 'qualified':
      return 'Trial Class';
    case 'converted':
      return 'Enrolled';
    case 'new':
      return 'New Lead';
    default:
      return null;
  }
}

type LeadSourceKey = 'instagram' | 'facebook' | 'website' | 'referral' | 'other';

const EMPTY_LEAD_SOURCES: Record<LeadSourceKey, number> = {
  instagram: 0,
  facebook: 0,
  website: 0,
  referral: 0,
  other: 0,
};

function normalizeLeadSource(value: string | null | undefined): LeadSourceKey {
  const normalized = (value ?? '').trim().toLowerCase();
  if (!normalized) return 'other';
  if (['instagram', 'ig', 'insta'].includes(normalized)) return 'instagram';
  if (['facebook', 'fb', 'meta'].includes(normalized)) return 'facebook';
  if (['website', 'web', 'site', 'direct', 'organic', 'search', 'google'].includes(normalized)) {
    return 'website';
  }
  if (['referral', 'friend', 'referido', 'recommendation', 'recomendation'].includes(normalized)) {
    return 'referral';
  }
  return 'other';
}

async function fetchPlatformLeads(
  tenantSlug: string
): Promise<{ rows: PlatformLeadRow[]; source: 'platform' | 'empty' }> {
  const db = getServiceClient();
  const { data, error } = await db
    .schema('platform')
    .from('peskids_leads')
    .select('lead_id, source, stage, status, referral_source, created_at')
    .eq('tenant_slug', tenantSlug)
    .order('created_at', { ascending: false });

  if (error !== null) {
    if (isMissingPlatformLeadColumns(error)) {
      return { rows: [], source: 'empty' };
    }
    throw error;
  }

  return { rows: (data ?? []) as PlatformLeadRow[], source: 'platform' };
}

async function fetchActiveStudents(tenantSlug: string): Promise<number> {
  const db = getServiceClient();
  const { count, error } = await db
    .from('students')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantSlug)
    .eq('status', 'active');

  if (error !== null) {
    logger.warn('peskids.executive.active_students', { tenantSlug, error: error.message });
    return 0;
  }

  return count ?? 0;
}

async function fetchRevenueMetrics(tenantSlug: string): Promise<{
  revenue_cents: number;
  pending_payments_cents: number;
  pending_payments_count: number;
}> {
  try {
    const db = getServiceClient();
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [paidResult, pendingResult] = await Promise.all([
      db
        .schema('peskids')
        .from('payments')
        .select('amount_cents')
        .eq('tenant_slug', tenantSlug)
        .eq('status', 'paid')
        .gte('paid_at', monthStart.toISOString()),
      db
        .schema('peskids')
        .from('payments')
        .select('amount_cents', { count: 'exact' })
        .eq('tenant_slug', tenantSlug)
        .eq('status', 'pending'),
    ]);

    const revenue_cents = (paidResult.data ?? []).reduce(
      (sum, row) => sum + Number((row as { amount_cents?: number }).amount_cents ?? 0),
      0
    );
    const pending_payments_cents = (pendingResult.data ?? []).reduce(
      (sum, row) => sum + Number((row as { amount_cents?: number }).amount_cents ?? 0),
      0
    );

    return {
      revenue_cents,
      pending_payments_cents,
      pending_payments_count: pendingResult.count ?? 0,
    };
  } catch (error) {
    logger.warn('peskids.executive.revenue_metrics', {
      tenantSlug,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      revenue_cents: 0,
      pending_payments_cents: 0,
      pending_payments_count: 0,
    };
  }
}

async function fetchFeedbackAlerts(tenantSlug: string): Promise<number> {
  const db = getServiceClient();
  const { count, error } = await db
    .schema('platform')
    .from('peskids_feedback')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_slug', tenantSlug)
    .lt('satisfaction', 3)
    .eq('status', 'action_required');

  if (error !== null) {
    logger.warn('peskids.executive.feedback_alerts', { tenantSlug, error: error.message });
    return 0;
  }

  return count ?? 0;
}

async function fetchPendingFollowups(tenantSlug: string): Promise<number> {
  const db = getServiceClient();
  const now = new Date().toISOString();
  const { count, error } = await db
    .from('followups')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantSlug)
    .eq('status', 'pending')
    .lt('due_date', now);

  if (error !== null) {
    logger.warn('peskids.executive.pending_followups', { tenantSlug, error: error.message });
    return 0;
  }

  return count ?? 0;
}

function countStages(rows: PlatformLeadRow[]): PeskidsExecutiveStageCount[] {
  return PESKIDS_PIPELINE_STAGES.map((stage) => ({
    stage,
    count: rows.filter((row) => normalizeLeadStage(row) === stage).length,
  }));
}

export async function fetchPeskidsExecutiveSummary(
  tenantSlug: string
): Promise<PeskidsExecutiveSummary> {
  const cacheKey = `peskids:executive_summary:${tenantSlug}`;

  const cached = await getCache<PeskidsExecutiveSummary>(cacheKey);
  if (cached) {
    return cached;
  }

  const [leadsResult, activeStudents, revenue, lowFeedbackCount, overdueFollowupsCount] =
    await Promise.all([
      fetchPlatformLeads(tenantSlug),
      fetchActiveStudents(tenantSlug),
      fetchRevenueMetrics(tenantSlug),
      fetchFeedbackAlerts(tenantSlug),
      fetchPendingFollowups(tenantSlug),
    ]);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const newLeads = leadsResult.rows.filter(
    (row) => new Date(row.created_at).getTime() >= monthStart.getTime()
  ).length;

  const convertedLeads = leadsResult.rows.filter((row) => {
    const stage = normalizeLeadStage(row);
    return stage === 'Enrolled' || stage === 'Active Student' || stage === 'Renewal';
  }).length;
  const conversionRatePct = newLeads > 0 ? Math.round((convertedLeads / newLeads) * 100) : null;
  const leadSources = leadsResult.rows.reduce(
    (acc, row) => {
      acc[normalizeLeadSource(row.referral_source ?? row.source)] += 1;
      return acc;
    },
    { ...EMPTY_LEAD_SOURCES }
  );

  const leadsWithoutContactCount = leadsResult.rows.filter((row) => {
    const stage = normalizeLeadStage(row);
    if (stage !== 'New Lead') {
      return false;
    }
    const createdAt = new Date(row.created_at).getTime();
    const ageMs = Date.now() - createdAt;
    return ageMs > 24 * 60 * 60 * 1000;
  }).length;

  const alerts: ExecutiveAlert[] = [
    {
      key: 'leads_without_contact',
      label: 'Leads sin contacto',
      count: leadsWithoutContactCount,
      detail: 'Leads en New Lead sin avance después de 24 horas.',
    },
    {
      key: 'pending_payments',
      label: 'Pagos pendientes',
      count: revenue.pending_payments_count,
      detail: 'Cuentas por cobrar todavía abiertas.',
    },
    {
      key: 'overdue_followups',
      label: 'Follow-ups vencidos',
      count: overdueFollowupsCount,
      detail: 'Seguimientos pendientes con fecha vencida.',
    },
    {
      key: 'low_feedback',
      label: 'Feedback bajo',
      count: lowFeedbackCount,
      detail: 'Respuestas de familias con satisfacción menor a 3.',
    },
  ].filter((item) => item.count > 0);

  const summary: PeskidsExecutiveSummary = {
    tenant_slug: tenantSlug,
    generated_at: new Date().toISOString(),
    metrics: {
      new_leads: newLeads,
      converted_leads: convertedLeads,
      conversion_rate_pct: conversionRatePct,
      active_students: activeStudents,
      revenue_cents: revenue.revenue_cents,
      pending_payments_cents: revenue.pending_payments_cents,
      alerts: alerts.reduce((sum, item) => sum + item.count, 0),
    },
    pipeline_stages: countStages(leadsResult.rows),
    lead_sources: leadSources,
    alerts,
  };

  // Bolt Optimization: Cache summary to reduce database load and parallel latency.
  void setCache(cacheKey, summary, CACHE_TTL.SHORT);

  return summary;
}
