import { supabaseServer } from '@/lib/supabase';
import type { DashboardData } from '@/lib/types';
import {
  isMissingPlatformPeskidsTable,
  mapPlatformFeedbackRow,
  mapPlatformLeadRow,
  type PlatformPeskidsFeedbackRow,
  type PlatformPeskidsLeadRow,
} from '@/lib/peskids-platform-read';
import { isMissingExpandedFeedbackColumn } from '@/lib/utils/db-compat';

function platformFrom(table: 'peskids_leads' | 'peskids_feedback') {
  const client = supabaseServer() as {
    schema: (name: string) => {
      from: (tableName: string) => ReturnType<ReturnType<typeof supabaseServer>['from']>;
    };
  };
  return client.schema('platform').from(table);
}

export async function fetchPlatformLeadsForDashboard(
  tenantSlug: string,
  periodStartISO: string,
  franchiseId?: string | null
): Promise<
  | { ok: true; rows: PlatformPeskidsLeadRow[] }
  | { ok: false; error: { message?: string } }
> {
  let query = platformFrom('peskids_leads')
    .select(
      'id, full_name, email, phone, lead_type, service_mode, class_modality, neighborhood, grade_interested, child_name, company_name, status, admin_notes, referral_source, created_at, franchise_id, twenty_person_id, twenty_opportunity_id'
    )
    .eq('tenant_slug', tenantSlug)
    .gte('created_at', periodStartISO)
    .order('created_at', { ascending: false });

  if (franchiseId) {
    query = query.eq('franchise_id', franchiseId);
  }

  const { data, error } = await query;

  if (error) {
    return { ok: false, error };
  }

  return { ok: true, rows: (data ?? []) as PlatformPeskidsLeadRow[] };
}

export async function fetchPlatformFeedbackForDashboard(
  tenantSlug: string,
  limit: number
): Promise<
  | { ok: true; rows: PlatformPeskidsFeedbackRow[] }
  | { ok: false; error: { message?: string } }
> {
  const { data, error } = await platformFrom('peskids_feedback')
    .select('id, child_name, satisfaction, suggestion, status, created_at')
    .eq('tenant_slug', tenantSlug)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return { ok: false, error };
  }

  return { ok: true, rows: (data ?? []) as PlatformPeskidsFeedbackRow[] };
}

export async function fetchDashboardLeads(
  tenantSlug: string,
  periodStartISO: string,
  franchiseId?: string | null
): Promise<{ rows: ReturnType<typeof mapPlatformLeadRow>[]; source: 'platform' | 'legacy' }> {
  const platformResult = await fetchPlatformLeadsForDashboard(
    tenantSlug,
    periodStartISO,
    franchiseId
  );
  if (platformResult.ok) {
    return {
      source: 'platform',
      rows: platformResult.rows.map(mapPlatformLeadRow),
    };
  }

  if (!isMissingPlatformPeskidsTable(platformResult.error)) {
    throw platformResult.error;
  }

  const supabase = supabaseServer();
  let query = supabase
    .from('leads')
    .select(
      'id, name, email, phone, lead_type, service_mode, class_modality, neighborhood, grade_interested, child_name, company_name, status, admin_notes, referral_code, referred_by_code, referral_discount_cents, referral_redemptions, referral_source, created_at, franchise_id'
    )
    .eq('tenant_id', tenantSlug)
    .gte('created_at', periodStartISO)
    .order('created_at', { ascending: false });

  if (franchiseId) {
    query = query.eq('franchise_id', franchiseId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  type LegacyLeadRow = {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    lead_type?: string | null;
    service_mode?: string | null;
    class_modality: DashboardData['new_leads'][number]['class_modality'];
    neighborhood: string | null;
    grade_interested: string;
    child_name?: string | null;
    company_name?: string | null;
    status: DashboardData['new_leads'][number]['status'];
    admin_notes: string | null;
    referral_code: string | null;
    referred_by_code: string | null;
    referral_discount_cents: number;
    referral_redemptions: number;
    referral_source: string | null;
    created_at?: string;
    franchise_id?: string | null;
  };

  return {
    source: 'legacy',
    rows: ((data ?? []) as LegacyLeadRow[]).map((row) =>
      mapPlatformLeadRow({
        id: row.id,
        full_name: row.name,
        email: row.email,
        phone: row.phone,
        lead_type: row.lead_type,
        service_mode: row.service_mode,
        class_modality: row.class_modality,
        neighborhood: row.neighborhood,
        grade_interested: row.grade_interested,
        child_name: row.child_name,
        company_name: row.company_name,
        status: row.status,
        admin_notes: row.admin_notes,
        referral_source: row.referral_source,
        created_at: row.created_at,
        franchise_id: row.franchise_id,
      })
    ),
  };
}

export async function fetchDashboardFeedback(
  tenantSlug: string,
  limit: number
): Promise<{
  recentFeedback: ReturnType<typeof mapPlatformFeedbackRow>[];
  privateFamilyNotes: DashboardData['private_family_notes'];
  source: 'platform' | 'legacy';
}> {
  const platformResult = await fetchPlatformFeedbackForDashboard(tenantSlug, limit);
  if (platformResult.ok) {
    return {
      source: 'platform',
      recentFeedback: platformResult.rows.slice(0, 5).map(mapPlatformFeedbackRow),
      privateFamilyNotes: [],
    };
  }

  if (!isMissingPlatformPeskidsTable(platformResult.error)) {
    throw platformResult.error;
  }

  return fetchLegacyDashboardFeedback(tenantSlug, limit);
}

async function fetchLegacyDashboardFeedback(
  tenantSlug: string,
  limit: number
): Promise<{
  recentFeedback: DashboardData['recent_feedback'];
  privateFamilyNotes: DashboardData['private_family_notes'];
  source: 'legacy';
}> {
  const supabase = supabaseServer();

  const feedbackResult = await supabase
    .from('feedback')
    .select(
      'id, child_name, satisfaction, suggestion, author_type, subject_type, visibility, audience, parent_email, body, rating, status, created_at'
    )
    .eq('tenant_id', tenantSlug)
    .order('created_at', { ascending: false })
    .limit(limit);

  const feedbackRows = (feedbackResult.data ?? []) as Array<
    DashboardData['recent_feedback'][number] & { created_at?: string }
  >;

  if (!feedbackResult.error) {
    return {
      source: 'legacy',
      recentFeedback: feedbackRows
        .filter((f) => f.visibility !== 'private')
        .slice(0, 5) as DashboardData['recent_feedback'],
      privateFamilyNotes: feedbackRows
        .filter((f) => f.visibility === 'private' && f.audience === 'family')
        .slice(0, 5) as DashboardData['private_family_notes'],
    };
  }

  if (isMissingExpandedFeedbackColumn(feedbackResult.error)) {
    const fallback = await supabase
      .from('feedback')
      .select('id, child_name, satisfaction, suggestion')
      .eq('tenant_id', tenantSlug)
      .order('created_at', { ascending: false })
      .limit(5);

    if (fallback.error) {
      throw fallback.error;
    }

    return {
      source: 'legacy',
      recentFeedback: (fallback.data ?? []) as DashboardData['recent_feedback'],
      privateFamilyNotes: [],
    };
  }

  throw feedbackResult.error;
}
