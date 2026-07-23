import { supabaseServer } from '@/lib/supabase';
import { normalizeLeadSourceLabel, type LeadSourceDisplay } from '@/lib/admin/lead-source-label';
import { leadAgingBadge, type LeadAgingBadge } from '@/lib/lead-aging';
import type { PeskidsClassModality } from '@/lib/lead-modality';
import {
  isMissingPlatformPeskidsTable,
  mapPlatformLeadRow,
  type PlatformPeskidsLeadRow,
} from '@/lib/peskids-platform-read';
import { decorateLeadWithCrmUrls } from '@/lib/services/dashboard.service';
import type { DashboardLead } from '@/lib/services/lead-admin.service';
import type { Database } from '@/lib/types';
import type { AdminLeadStatus } from '@/lib/validation/lead-admin.schema';

export type PipelineColumnId =
  | 'nuevos'
  | 'contactados'
  | 'trial_agendado'
  | 'trial_realizado'
  | 'matriculados'
  | 'perdidos';

export const PIPELINE_COLUMN_ORDER: PipelineColumnId[] = [
  'nuevos',
  'contactados',
  'trial_agendado',
  'trial_realizado',
  'matriculados',
  'perdidos',
];

export const PIPELINE_COLUMN_LABELS: Record<PipelineColumnId, string> = {
  nuevos: 'Nuevos',
  contactados: 'Contactados',
  trial_agendado: 'Trial agendado',
  trial_realizado: 'Trial realizado',
  matriculados: 'Matriculados',
  perdidos: 'Perdidos',
};

/** Admin status applied when a card moves into this column (best-effort for trial split). */
export const PIPELINE_COLUMN_ADMIN_STATUS: Record<PipelineColumnId, AdminLeadStatus> = {
  nuevos: 'new',
  contactados: 'contacted',
  trial_agendado: 'trial',
  trial_realizado: 'trial',
  matriculados: 'enrolled',
  perdidos: 'archived',
};

export type TrialSummary = {
  lead_id: string;
  status: 'scheduled' | 'confirmed' | 'attended' | 'no_show' | 'cancelled';
};

export type PipelineLeadCard = {
  lead: DashboardLead;
  column: PipelineColumnId;
  stage_entered_at: string;
  overdue: boolean;
  aging_badge: LeadAgingBadge | null;
  has_overdue_followup: boolean;
};

export type PipelineFilters = {
  source?: LeadSourceDisplay | 'all';
  modality?: PeskidsClassModality | 'all';
  created_from?: string;
  created_to?: string;
  overdue_only?: boolean;
};

export type PipelineBoard = {
  columns: Record<PipelineColumnId, PipelineLeadCard[]>;
  counts: Record<PipelineColumnId, number>;
  total: number;
};

function platformFrom() {
  const client = supabaseServer() as {
    schema: (name: string) => {
      from: (tableName: string) => ReturnType<ReturnType<typeof supabaseServer>['from']>;
    };
  };
  return client.schema('platform').from('peskids_leads');
}

export function leadHasAttendedTrial(
  leadId: string,
  trialsByLead: ReadonlyMap<string, readonly TrialSummary[]>
): boolean {
  const trials = trialsByLead.get(leadId) ?? [];
  return trials.some((trial) => trial.status === 'attended');
}

/**
 * Maps a lead (+ trial attendance hint) into a Kanban column without schema changes.
 */
export function resolvePipelineColumn(
  lead: Pick<DashboardLead, 'id' | 'status'>,
  trialsByLead: ReadonlyMap<string, readonly TrialSummary[]>
): PipelineColumnId {
  const status = lead.status;

  if (status === 'archived') return 'perdidos';
  if (status === 'enrolled' || status === 'active' || status === 'renewal') return 'matriculados';
  if (status === 'contacted') return 'contactados';
  if (status === 'new') return 'nuevos';
  if (status === 'trial') {
    return leadHasAttendedTrial(lead.id, trialsByLead) ? 'trial_realizado' : 'trial_agendado';
  }

  return 'nuevos';
}

export function buildTrialsByLeadId(trials: readonly TrialSummary[]): Map<string, TrialSummary[]> {
  const map = new Map<string, TrialSummary[]>();
  for (const trial of trials) {
    const existing = map.get(trial.lead_id) ?? [];
    existing.push(trial);
    map.set(trial.lead_id, existing);
  }
  return map;
}

export function isPipelineLeadOverdue(
  lead: DashboardLead,
  overdueFollowupLeadIds: ReadonlySet<string>,
  now: Date = new Date()
): { overdue: boolean; aging_badge: LeadAgingBadge | null; has_overdue_followup: boolean } {
  const has_overdue_followup = overdueFollowupLeadIds.has(lead.id);
  const aging_badge = leadAgingBadge(lead.status, lead.created_at ?? '', now);
  return {
    overdue: has_overdue_followup || aging_badge !== null,
    aging_badge,
    has_overdue_followup,
  };
}

export function buildPipelineLeadCard(
  lead: DashboardLead,
  trialsByLead: ReadonlyMap<string, readonly TrialSummary[]>,
  overdueFollowupLeadIds: ReadonlySet<string>,
  now: Date = new Date()
): PipelineLeadCard {
  const column = resolvePipelineColumn(lead, trialsByLead);
  const overdueState = isPipelineLeadOverdue(lead, overdueFollowupLeadIds, now);

  return {
    lead,
    column,
    stage_entered_at: lead.created_at ?? new Date().toISOString(),
    overdue: overdueState.overdue,
    aging_badge: overdueState.aging_badge,
    has_overdue_followup: overdueState.has_overdue_followup,
  };
}

function emptyColumns(): Record<PipelineColumnId, PipelineLeadCard[]> {
  return {
    nuevos: [],
    contactados: [],
    trial_agendado: [],
    trial_realizado: [],
    matriculados: [],
    perdidos: [],
  };
}

function emptyCounts(): Record<PipelineColumnId, number> {
  return {
    nuevos: 0,
    contactados: 0,
    trial_agendado: 0,
    trial_realizado: 0,
    matriculados: 0,
    perdidos: 0,
  };
}

export function matchesPipelineFilters(
  card: PipelineLeadCard,
  filters: PipelineFilters
): boolean {
  const { lead } = card;

  if (filters.source && filters.source !== 'all') {
    if (normalizeLeadSourceLabel(lead.referral_source) !== filters.source) {
      return false;
    }
  }

  if (filters.modality && filters.modality !== 'all') {
    if (lead.class_modality !== filters.modality) {
      return false;
    }
  }

  if (filters.created_from) {
    const created = lead.created_at ?? '';
    if (!created || created.slice(0, 10) < filters.created_from) {
      return false;
    }
  }

  if (filters.created_to) {
    const created = lead.created_at ?? '';
    if (!created || created.slice(0, 10) > filters.created_to) {
      return false;
    }
  }

  if (filters.overdue_only && !card.overdue) {
    return false;
  }

  return true;
}

export function groupLeadsIntoPipelineColumns(
  leads: readonly DashboardLead[],
  trials: readonly TrialSummary[],
  overdueFollowupLeadIds: ReadonlySet<string>,
  filters: PipelineFilters = {},
  now: Date = new Date()
): PipelineBoard {
  const trialsByLead = buildTrialsByLeadId(trials);
  const columns = emptyColumns();
  const counts = emptyCounts();

  for (const lead of leads) {
    const card = buildPipelineLeadCard(lead, trialsByLead, overdueFollowupLeadIds, now);
    if (!matchesPipelineFilters(card, filters)) {
      continue;
    }
    columns[card.column].push(card);
    counts[card.column] += 1;
  }

  for (const columnId of PIPELINE_COLUMN_ORDER) {
    columns[columnId].sort((a, b) =>
      (b.stage_entered_at ?? '').localeCompare(a.stage_entered_at ?? '')
    );
  }

  const total = PIPELINE_COLUMN_ORDER.reduce((sum, columnId) => sum + counts[columnId], 0);

  return { columns, counts, total };
}

async function fetchAllPlatformLeads(tenantSlug: string): Promise<DashboardLead[] | null> {
  const { data, error } = await platformFrom()
    .select(
      'id, full_name, email, phone, class_modality, neighborhood, grade_interested, status, admin_notes, referral_source, created_at, twenty_person_id, twenty_opportunity_id'
    )
    .eq('tenant_slug', tenantSlug)
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingPlatformPeskidsTable(error)) {
      return null;
    }
    throw error;
  }

  return (data ?? []).map((row: PlatformPeskidsLeadRow) =>
    decorateLeadWithCrmUrls(mapPlatformLeadRow(row))
  );
}

async function fetchAllLegacyLeads(tenantSlug: string): Promise<DashboardLead[]> {
  const { data, error } = await supabaseServer()
    .from('leads')
    .select(
      'id, name, email, phone, class_modality, neighborhood, grade_interested, status, admin_notes, referral_code, referred_by_code, referral_discount_cents, referral_redemptions, referral_source, created_at'
    )
    .eq('tenant_id', tenantSlug)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  type LegacyLeadRow = Pick<
    Database['public']['Tables']['leads']['Row'],
    | 'id'
    | 'name'
    | 'email'
    | 'phone'
    | 'class_modality'
    | 'neighborhood'
    | 'grade_interested'
    | 'status'
    | 'admin_notes'
    | 'referral_code'
    | 'referred_by_code'
    | 'referral_discount_cents'
    | 'referral_redemptions'
    | 'referral_source'
    | 'created_at'
  >;

  return (data ?? []).map((row: LegacyLeadRow) =>
    decorateLeadWithCrmUrls({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      class_modality: row.class_modality,
      neighborhood: row.neighborhood,
      grade_interested: row.grade_interested,
      status: row.status,
      admin_notes: row.admin_notes,
      referral_code: row.referral_code,
      referred_by_code: row.referred_by_code,
      referral_discount_cents: row.referral_discount_cents,
      referral_redemptions: row.referral_redemptions,
      referral_source: row.referral_source,
      created_at: row.created_at ?? new Date().toISOString(),
      twenty_person_id: null,
      twenty_opportunity_id: null,
    })
  );
}

async function fetchTrialSummaries(tenantSlug: string): Promise<TrialSummary[]> {
  const { data, error } = await supabaseServer()
    .from('trial_classes')
    .select('lead_id, status')
    .eq('tenant_id', tenantSlug);

  if (error) {
    throw error;
  }

  return (data ?? []) as TrialSummary[];
}

async function fetchOverdueFollowupLeadIds(
  tenantSlug: string,
  now: Date = new Date()
): Promise<Set<string>> {
  const today = now.toISOString().slice(0, 10);
  const { data, error } = await supabaseServer()
    .from('followups')
    .select('contact_id')
    .eq('tenant_id', tenantSlug)
    .eq('contact_type', 'lead')
    .eq('status', 'pending')
    .lt('due_date', today);

  if (error) {
    throw error;
  }

  return new Set((data ?? []).map((row) => row.contact_id));
}

export async function fetchPipelineBoard(
  tenantSlug: string,
  filters: PipelineFilters = {},
  now: Date = new Date()
): Promise<PipelineBoard> {
  const platformLeads = await fetchAllPlatformLeads(tenantSlug);
  const leads =
    platformLeads ?? (await fetchAllLegacyLeads(tenantSlug));

  const [trials, overdueFollowupLeadIds] = await Promise.all([
    fetchTrialSummaries(tenantSlug),
    fetchOverdueFollowupLeadIds(tenantSlug, now),
  ]);

  return groupLeadsIntoPipelineColumns(leads, trials, overdueFollowupLeadIds, filters, now);
}

export function parsePipelineFilters(searchParams: URLSearchParams): PipelineFilters {
  const source = searchParams.get('source')?.trim();
  const modality = searchParams.get('modality')?.trim();
  const createdFrom = searchParams.get('created_from')?.trim();
  const createdTo = searchParams.get('created_to')?.trim();
  const overdueOnly = searchParams.get('overdue_only') === '1';

  const filters: PipelineFilters = {};

  if (source && source !== 'all') {
    filters.source = source as LeadSourceDisplay;
  }

  if (modality && modality !== 'all') {
    filters.modality = modality as PeskidsClassModality;
  }

  if (createdFrom) {
    filters.created_from = createdFrom;
  }

  if (createdTo) {
    filters.created_to = createdTo;
  }

  if (overdueOnly) {
    filters.overdue_only = true;
  }

  return filters;
}
