import { getServiceClient } from '../supabase';
import { PESKIDS_LOW_SATISFACTION_THRESHOLD, PESKIDS_TENANT_SLUG } from './constants';
import { encryptPeskidsPiiField } from './pii-crypto';
import type { PeskidsFeedbackBody, PeskidsLeadBody } from './schemas';

export type PeskidsLeadRow = {
  id: string;
  tenant_slug: string;
  full_name: string;
  email: string;
  phone: string | null;
  lead_type: string;
  service_mode: string | null;
  class_modality: string | null;
  neighborhood: string | null;
  grade_interested: string;
  child_name: string | null;
  birth_date: string | null;
  document_type: string | null;
  document_number: string | null;
  company_name: string | null;
  company_nit: string | null;
  referral_source: string | null;
  status: string;
  admin_notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type PeskidsFeedbackRow = {
  id: string;
  tenant_slug: string;
  child_name: string;
  satisfaction: number;
  suggestion: string | null;
  contact_me_back: boolean;
  status: string;
  created_at: string;
};

function normalizePhone(phone: string | undefined): string | null {
  if (phone === undefined || phone.length === 0) {
    return null;
  }
  return phone;
}

export async function peskidsInsertLead(
  body: PeskidsLeadBody
): Promise<{ ok: true; row: PeskidsLeadRow } | { ok: false; error: string }> {
  let documentNumber: string | null;
  let companyNit: string | null;
  try {
    documentNumber = encryptPeskidsPiiField(body.document_number);
    companyNit = encryptPeskidsPiiField(body.company_nit);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'PII encryption failed';
    return { ok: false, error: message };
  }

  const client = getServiceClient();
  const { data, error } = await client
    .schema('platform')
    .from('peskids_leads')
    .insert({
      tenant_slug: PESKIDS_TENANT_SLUG,
      full_name: body.name,
      email: body.email,
      phone: normalizePhone(body.phone),
      lead_type: body.lead_type,
      service_mode: body.service_mode,
      class_modality: body.class_modality,
      neighborhood: body.neighborhood,
      grade_interested: body.grade_interested,
      child_name: body.child_name ?? null,
      birth_date: body.birth_date ?? null,
      document_type: body.document_type ?? null,
      document_number: documentNumber,
      company_name: body.company_name ?? null,
      company_nit: companyNit,
      metadata: {
        intake_version: 'dynamic-intake-v1',
        ...(body.metadata ?? {}),
      },
      referral_source: body.referral_source ?? null,
      status: 'new',
      ghl_contact_id: body.ghl_contact_id ?? null,
      twenty_person_id: body.twenty_person_id ?? null,
      twenty_opportunity_id: body.twenty_opportunity_id ?? null,
    })
    .select(
      'id, tenant_slug, full_name, email, phone, lead_type, service_mode, class_modality, neighborhood, grade_interested, child_name, birth_date, document_type, document_number, company_name, company_nit, referral_source, status, admin_notes, metadata, created_at'
    )
    .single();

  if (error !== null || data === null) {
    return { ok: false, error: error?.message ?? 'insert failed' };
  }
  return { ok: true, row: data as PeskidsLeadRow };
}

export async function peskidsInsertFeedback(
  body: PeskidsFeedbackBody
): Promise<{ ok: true; row: PeskidsFeedbackRow } | { ok: false; error: string }> {
  const status = body.satisfaction < PESKIDS_LOW_SATISFACTION_THRESHOLD ? 'action_required' : 'new';

  const client = getServiceClient();
  const { data, error } = await client
    .schema('platform')
    .from('peskids_feedback')
    .insert({
      tenant_slug: PESKIDS_TENANT_SLUG,
      child_name: body.child_name,
      satisfaction: body.satisfaction,
      suggestion: body.suggestion ?? null,
      contact_me_back: body.contact_me_back,
      status,
    })
    .select(
      'id, tenant_slug, child_name, satisfaction, suggestion, contact_me_back, status, created_at'
    )
    .single();

  if (error !== null || data === null) {
    return { ok: false, error: error?.message ?? 'insert failed' };
  }
  return { ok: true, row: data as PeskidsFeedbackRow };
}

function weekStartIso(): string {
  const d = new Date();
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export type PeskidsDashboardSummary = {
  tenant_slug: string;
  new_leads_this_week: number;
  recent_leads: PeskidsLeadRow[];
  recent_feedback: PeskidsFeedbackRow[];
  feedback_action_required: number;
  low_rating_alerts: PeskidsFeedbackRow[];
};

interface QueryResponse {
  error?: { message: string } | null;
}

function getFirstQueryError(
  leadsWeek: QueryResponse,
  recentLeads: QueryResponse,
  recentFeedback: QueryResponse,
  actionCount: QueryResponse
): string | null {
  if (leadsWeek.error) return leadsWeek.error.message;
  if (recentLeads.error) return recentLeads.error.message;
  if (recentFeedback.error) return recentFeedback.error.message;
  if (actionCount.error) return actionCount.error.message;
  return null;
}

export async function peskidsFetchDashboardSummary(): Promise<
  { ok: true; summary: PeskidsDashboardSummary } | { ok: false; error: string }
> {
  const client = getServiceClient();
  const since = weekStartIso();

  const [leadsWeek, recentLeads, recentFeedback, actionCount, lowAlerts] = await Promise.all([
    client
      .schema('platform')
      .from('peskids_leads')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_slug', PESKIDS_TENANT_SLUG)
      .gte('created_at', since),
    client
      .schema('platform')
      .from('peskids_leads')
      .select(
        'id, tenant_slug, full_name, email, phone, lead_type, service_mode, class_modality, neighborhood, grade_interested, child_name, company_name, referral_source, status, admin_notes, created_at'
      )
      .eq('tenant_slug', PESKIDS_TENANT_SLUG)
      .order('created_at', { ascending: false })
      .limit(10),
    client
      .schema('platform')
      .from('peskids_feedback')
      .select(
        'id, tenant_slug, child_name, satisfaction, suggestion, contact_me_back, status, created_at'
      )
      .eq('tenant_slug', PESKIDS_TENANT_SLUG)
      .order('created_at', { ascending: false })
      .limit(10),
    client
      .schema('platform')
      .from('peskids_feedback')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_slug', PESKIDS_TENANT_SLUG)
      .eq('status', 'action_required'),
    client
      .schema('platform')
      .from('peskids_feedback')
      .select(
        'id, tenant_slug, child_name, satisfaction, suggestion, contact_me_back, status, created_at'
      )
      .eq('tenant_slug', PESKIDS_TENANT_SLUG)
      .lt('satisfaction', PESKIDS_LOW_SATISFACTION_THRESHOLD)
      .eq('status', 'action_required')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const errorMsg = getFirstQueryError(leadsWeek, recentLeads, recentFeedback, actionCount);
  if (errorMsg) {
    return { ok: false, error: errorMsg };
  }

  return {
    ok: true,
    summary: {
      tenant_slug: PESKIDS_TENANT_SLUG,
      new_leads_this_week: leadsWeek.count ?? 0,
      recent_leads: (recentLeads.data ?? []) as PeskidsLeadRow[],
      recent_feedback: (recentFeedback.data ?? []) as PeskidsFeedbackRow[],
      feedback_action_required: actionCount.count ?? 0,
      low_rating_alerts: (lowAlerts.data ?? []) as PeskidsFeedbackRow[],
    },
  };
}

export async function peskidsUpdateLeadMetadata(
  leadId: string,
  metadata: Record<string, unknown>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const client = getServiceClient();
  const { error } = await client
    .schema('platform')
    .from('peskids_leads')
    .update({ metadata })
    .eq('id', leadId)
    .eq('tenant_slug', PESKIDS_TENANT_SLUG);

  if (error !== null) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
