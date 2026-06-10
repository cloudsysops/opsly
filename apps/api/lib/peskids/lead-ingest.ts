import { getServiceClient } from '../supabase';
import {
  leadStatusFromPipelineStage,
  normalizePeskidsPipelineStage,
  type GoHighLevelLeadWebhook,
  type PeskidsPipelineStage,
} from './ghl-contract';

export type PeskidsLeadPersistInput = {
  tenantSlug: string;
  leadId: string;
  source: 'web' | 'gohighlevel' | 'n8n' | 'manual';
  stage: PeskidsPipelineStage;
  createdAt: string;
  parentName: string;
  phone: string | null;
  email: string;
  childName: string;
  age: number;
  interest: string;
  eventId: string;
  automationReady: boolean;
  ghlContactId?: string | null;
  ghlOpportunityId?: string | null;
  ghlPipelineId?: string | null;
  ghlStageId?: string | null;
};

export type PeskidsLeadRecord = {
  id: string;
  tenant_slug: string;
  lead_id: string | null;
  source: string | null;
  stage: string | null;
  created_at: string;
  ghl_contact_id?: string | null;
  ghl_opportunity_id?: string | null;
  ghl_pipeline_id?: string | null;
  ghl_stage_id?: string | null;
};

function leadSelectList(): string {
  return [
    'id',
    'tenant_slug',
    'lead_id',
    'source',
    'stage',
    'created_at',
    'updated_at',
    'ghl_contact_id',
    'ghl_opportunity_id',
    'ghl_pipeline_id',
    'ghl_stage_id',
  ].join(', ');
}

function buildLeadBaseRow(input: PeskidsLeadPersistInput): Record<string, unknown> {
  return {
    tenant_slug: input.tenantSlug,
    lead_id: input.leadId,
    source: input.source,
    stage: input.stage,
    status: leadStatusFromPipelineStage(input.stage),
    full_name: input.parentName,
    email: input.email,
    grade_interested: input.interest,
    parent_name: input.parentName,
    phone: input.phone,
    child_name: input.childName,
    age: input.age,
    interest: input.interest,
    event_id: input.eventId,
    automation_ready: input.automationReady,
    referral_source: input.source === 'gohighlevel' ? 'GoHighLevel' : input.source,
    ghl_contact_id: input.ghlContactId ?? null,
    ghl_opportunity_id: input.ghlOpportunityId ?? null,
    ghl_pipeline_id: input.ghlPipelineId ?? null,
    ghl_stage_id: input.ghlStageId ?? null,
  };
}

function buildLeadInsertRow(input: PeskidsLeadPersistInput): Record<string, unknown> {
  return {
    ...buildLeadBaseRow(input),
    created_at: input.createdAt,
    updated_at: input.createdAt,
  };
}

function buildLeadUpdateRow(input: PeskidsLeadPersistInput): Record<string, unknown> {
  return {
    ...buildLeadBaseRow(input),
    updated_at: new Date().toISOString(),
  };
}

async function fetchExistingLead(
  tenantSlug: string,
  leadId: string
): Promise<PeskidsLeadRecord | null> {
  const db = getServiceClient();
  const { data, error } = await db
    .schema('platform')
    .from('peskids_leads')
    .select(leadSelectList())
    .eq('tenant_slug', tenantSlug)
    .eq('lead_id', leadId)
    .maybeSingle();

  if (error !== null) {
    throw error;
  }

  return (data ?? null) as PeskidsLeadRecord | null;
}

export async function persistPeskidsLead(
  input: PeskidsLeadPersistInput
): Promise<{ ok: true; row: PeskidsLeadRecord; created: boolean } | { ok: false; error: string }> {
  const db = getServiceClient();
  const existing = await fetchExistingLead(input.tenantSlug, input.leadId);
  const row = buildLeadUpdateRow(input);

  if (existing !== null) {
    const { data, error } = await db
      .schema('platform')
      .from('peskids_leads')
      .update(row)
      .eq('id', existing.id)
      .select(leadSelectList())
      .maybeSingle();

    if (error !== null || data === null) {
      return { ok: false, error: error?.message ?? 'lead update failed' };
    }

    return { ok: true, row: data as unknown as PeskidsLeadRecord, created: false };
  }

  const { data, error } = await db
    .schema('platform')
    .from('peskids_leads')
    .insert(buildLeadInsertRow(input))
    .select(leadSelectList())
    .maybeSingle();

  if (error !== null || data === null) {
    return { ok: false, error: error?.message ?? 'lead insert failed' };
  }

  return { ok: true, row: data as unknown as PeskidsLeadRecord, created: true };
}

export function buildPeskidsLeadPersistInputFromGoHighLevel(
  payload: GoHighLevelLeadWebhook
): PeskidsLeadPersistInput {
  const stage = normalizePeskidsPipelineStage(payload.pipeline_stage);
  return {
    tenantSlug: payload.tenant_slug,
    leadId: payload.lead_id,
    source: payload.source,
    stage,
    createdAt: payload.occurred_at,
    parentName: payload.lead.parent_name,
    phone: payload.lead.phone ?? null,
    email: payload.lead.email,
    childName: payload.lead.child_name,
    age: payload.lead.age,
    interest: payload.lead.interest,
    eventId: payload.event_id,
    automationReady: true,
    ghlContactId: payload.ghl?.contact_id ?? null,
    ghlOpportunityId: payload.ghl?.opportunity_id ?? null,
    ghlPipelineId: payload.ghl?.pipeline_id ?? null,
    ghlStageId: payload.ghl?.stage_id ?? null,
  };
}
