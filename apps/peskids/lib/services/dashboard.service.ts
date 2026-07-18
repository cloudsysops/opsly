import { supabaseServer, getRecentMessages, getWacrmMessages } from '../supabase';
import { isMissingExpandedFeedbackColumn } from '../utils/db-compat';
import type { Database, DashboardData } from '../types';
import { fetchOperationsMetrics } from './operations-metrics.service';
import { fetchDashboardLeads } from '../peskids-platform-dashboard';
import { buildDashboardSalesAnalytics } from './sales-analytics.service';
import { fetchDashboardIntegrationStatus } from './integration-status.service';

type Range = 'week' | 'month';
type LeadSourceKey = 'instagram' | 'facebook' | 'website' | 'referral' | 'other';

const EMPTY_LEAD_SOURCES: Record<LeadSourceKey, number> = {
  instagram: 0,
  facebook: 0,
  website: 0,
  referral: 0,
  other: 0,
};

function normalizeLeadSource(value: string | null | undefined): LeadSourceKey {
  const normalized = value?.trim().toLowerCase();
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

function resolveTwentyBaseUrl(): string {
  return (
    process.env.TWENTY_API_URL?.trim() ||
    process.env.TWENTY_SERVER_URL?.trim() ||
    process.env.TWENTY_PESKIDS_API_URL?.trim() ||
    ''
  ).replace(/\/$/, '');
}

function decorateLeadWithCrmUrls(lead: DashboardData['new_leads'][number]): DashboardData['new_leads'][number] {
  const twentyBase = resolveTwentyBaseUrl();
  const hasPerson = Boolean(lead.twenty_person_id?.trim());
  const hasOpportunity = Boolean(lead.twenty_opportunity_id?.trim());

  return {
    ...lead,
    twenty_person_url:
      hasPerson && twentyBase ? `${twentyBase}/objects/people/${lead.twenty_person_id}` : null,
    twenty_opportunity_url:
      hasOpportunity && twentyBase
        ? `${twentyBase}/objects/opportunities/${lead.twenty_opportunity_id}`
        : null,
    twenty_sync_status: hasPerson && hasOpportunity ? 'synced' : hasPerson || hasOpportunity ? 'warning' : 'pending',
  };
}

export async function fetchDashboardData(tenantId: string, range: Range): Promise<DashboardData> {
  const supabase = supabaseServer();

  const today = new Date();
  const periodStart = new Date(today);
  if (range === 'month') {
    periodStart.setDate(1);
  } else {
    periodStart.setDate(today.getDate() - today.getDay());
  }
  periodStart.setHours(0, 0, 0, 0);
  const periodStartISO = periodStart.toISOString();

  const platformLeadsResult = await fetchDashboardLeads(tenantId, periodStartISO);
  const newLeads = (platformLeadsResult.rows ?? []).map(decorateLeadWithCrmUrls);

  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('id, grade, status, parent_email')
    .eq('tenant_id', tenantId)
    .eq('status', 'active');

  if (studentsError) throw studentsError;

  const studentsByGrade: Record<string, number> = {};
  const typedStudents = students as Array<
    Pick<Database['public']['Tables']['students']['Row'], 'grade' | 'parent_email'>
  >;
  typedStudents?.forEach((s) => {
    studentsByGrade[s.grade] = (studentsByGrade[s.grade] || 0) + 1;
  });
  const familiesActiveCount = new Set(
    typedStudents
      .map((student) => student.parent_email?.trim().toLowerCase() ?? '')
      .filter((email) => email.length > 0)
  ).size;

  let recentFeedback: DashboardData['recent_feedback'] | null = null;
  let privateFamilyNotes: DashboardData['private_family_notes'] | null = null;
  let feedbackError: { message?: string } | null = null;

  const feedbackResult = await supabase
    .from('feedback')
    .select(
      'id, child_name, satisfaction, suggestion, author_type, subject_type, visibility, audience, parent_email, body, rating, status, created_at'
    )
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(20);

  const feedbackRows = (feedbackResult.data ?? []) as Array<
    DashboardData['recent_feedback'][number] & { created_at?: string }
  >;
  feedbackError = feedbackResult.error;

  if (!feedbackError) {
    recentFeedback = feedbackRows
      .filter((f) => f.visibility !== 'private')
      .slice(0, 5) as DashboardData['recent_feedback'];
    privateFamilyNotes = feedbackRows
      .filter((f) => f.visibility === 'private' && f.audience === 'family')
      .slice(0, 5) as DashboardData['private_family_notes'];
  }

  if (feedbackError && isMissingExpandedFeedbackColumn(feedbackError)) {
    const fallback = await supabase
      .from('feedback')
      .select('id, child_name, satisfaction, suggestion')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(5);
    recentFeedback = fallback.data as unknown as DashboardData['recent_feedback'];
    feedbackError = fallback.error;
    privateFamilyNotes = [];
  }

  if (feedbackError) throw feedbackError;

  const { data: followups, error: followupsError } = await supabase
    .from('followups')
    .select('id, contact_id, contact_type, due_date, type, status, notes, created_at')
    .eq('tenant_id', tenantId)
    .order('due_date', { ascending: true });

  if (followupsError) throw followupsError;

  const { data: trialClasses, error: trialClassesError } = await supabase
    .from('trial_classes')
    .select('lead_id, created_at, status')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (trialClassesError) throw trialClassesError;

  const pendingFollowups = (followups ?? []).filter((f) => f.status === 'pending');
  const recentMessages = await getRecentMessages(tenantId, 10);
  const wacrmMessages = await getWacrmMessages(tenantId);
  const operations = await fetchOperationsMetrics();
  const convertedLeadsCount = (newLeads ?? []).filter((lead) => lead.status === 'enrolled').length;
  const conversionRatePct =
    (newLeads?.length ?? 0) > 0
      ? Math.round((convertedLeadsCount / (newLeads?.length ?? 0)) * 100)
      : null;
  const leadSources = (newLeads ?? []).reduce(
    (acc, lead) => {
      acc[normalizeLeadSource(lead.referral_source)] += 1;
      return acc;
    },
    { ...EMPTY_LEAD_SOURCES }
  );

  const salesAnalytics = buildDashboardSalesAnalytics({
    periodStartISO,
    leads: newLeads as DashboardData['new_leads'],
    followups: (followups ?? []) as Array<DashboardData['followups'][number] & { created_at?: string }>,
    trialClasses: (trialClasses ?? []) as Array<{ lead_id: string; created_at?: string; status?: string }>,
  });

  const integration_status = await fetchDashboardIntegrationStatus(process.env as Record<string, string | undefined>);

  return {
    new_leads_count: newLeads?.length || 0,
    converted_leads_count: convertedLeadsCount,
    conversion_rate_pct: conversionRatePct,
    lead_sources: leadSources,
    new_leads: (newLeads as unknown as DashboardData['new_leads']) || [],
    active_students_count: students?.length || 0,
    families_active_count: familiesActiveCount,
    students_by_grade: studentsByGrade,
    recent_feedback: (recentFeedback as unknown as DashboardData['recent_feedback']) || [],
    private_family_notes:
      (privateFamilyNotes as unknown as DashboardData['private_family_notes']) || [],
    pending_followups_count: pendingFollowups?.length || 0,
    pending_followups: (pendingFollowups as DashboardData['pending_followups']) || [],
    followups: (followups as DashboardData['followups']) || [],
    recent_messages: (recentMessages as DashboardData['recent_messages']) || [],
    wacrm_messages: wacrmMessages,
    operations,
    integration_status,
    sales_analytics: salesAnalytics,
  };
}
