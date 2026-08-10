import { supabaseServer } from '@/lib/supabase';
import type { Database } from '@/lib/types';
import type { CreatePendingFollowupInput, LeadFollowupStore } from '@/lib/agents/lead-followup-store';
import { createSupabaseLeadFollowupStore } from '@/lib/agents/lead-followup-store';

export type ScheduledTrialRecord = Pick<
  Database['public']['Tables']['trial_classes']['Row'],
  'id' | 'lead_id' | 'scheduled_date' | 'scheduled_time' | 'status'
>;

export type CreateLocalTrialInput = {
  tenantId: string;
  leadId: string;
  scheduledDate: string;
  scheduledTime: string;
  modality: 'llanogrande' | 'domicilio';
  notes?: string | null;
};

export interface TrialSchedulingStore {
  findScheduledTrialForLead(
    leadId: string,
    tenantId: string
  ): Promise<ScheduledTrialRecord | null>;
  countTrialsAtSlot(tenantId: string, scheduledDate: string, scheduledTime: string): Promise<number>;
  getDefaultCapacity(tenantId: string): Promise<number>;
  createLocalTrial(input: CreateLocalTrialInput): Promise<ScheduledTrialRecord>;
  createPendingFollowup(input: CreatePendingFollowupInput): Promise<{ id: string }>;
  listUpcomingTrials(tenantId: string, withinHours: number): Promise<ScheduledTrialRecord[]>;
  findTrialById(trialClassId: string, tenantId: string): Promise<ScheduledTrialRecord | null>;
  getLeadContact(
    leadId: string,
    tenantId: string
  ): Promise<{ name: string; twenty_person_id: string | null } | null>;
}

const ACTIVE_TRIAL_STATUSES: ScheduledTrialRecord['status'][] = ['scheduled', 'confirmed'];

function normalizeTime(value: string): string {
  return value.length === 5 ? `${value}:00` : value;
}

function slotTimeFromIso(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}:00`;
}

function slotDateFromIso(iso: string): string {
  return iso.slice(0, 10);
}

export class SupabaseTrialSchedulingStore implements TrialSchedulingStore {
  constructor(private readonly followupStore: LeadFollowupStore = createSupabaseLeadFollowupStore()) {}

  async findScheduledTrialForLead(
    leadId: string,
    tenantId: string
  ): Promise<ScheduledTrialRecord | null> {
    const { data, error } = await supabaseServer()
      .from('trial_classes')
      .select('id, lead_id, scheduled_date, scheduled_time, status')
      .eq('tenant_id', tenantId)
      .eq('lead_id', leadId)
      .in('status', ACTIVE_TRIAL_STATUSES)
      .order('scheduled_date', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data ?? null;
  }

  async countTrialsAtSlot(
    tenantId: string,
    scheduledDate: string,
    scheduledTime: string
  ): Promise<number> {
    const time = normalizeTime(scheduledTime);
    const { count, error } = await supabaseServer()
      .from('trial_classes')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('scheduled_date', scheduledDate)
      .eq('scheduled_time', time)
      .in('status', ACTIVE_TRIAL_STATUSES);

    if (error) throw error;
    return count ?? 0;
  }

  async getDefaultCapacity(tenantId: string): Promise<number> {
    const { data, error } = await supabaseServer()
      .from('tenant_settings')
      .select('default_capacity')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) throw error;
    const capacity = data?.default_capacity;
    return typeof capacity === 'number' && capacity > 0 ? capacity : 4;
  }

  async createLocalTrial(input: CreateLocalTrialInput): Promise<ScheduledTrialRecord> {
    const { data, error } = await supabaseServer()
      .from('trial_classes')
      .insert({
        tenant_id: input.tenantId,
        lead_id: input.leadId,
        scheduled_date: input.scheduledDate,
        scheduled_time: normalizeTime(input.scheduledTime),
        modality: input.modality,
        notes: input.notes ?? null,
        status: 'scheduled',
      })
      .select('id, lead_id, scheduled_date, scheduled_time, status')
      .single();

    if (error || !data) {
      throw error ?? new Error('trial class insert failed');
    }

    const leadPatch: Database['public']['Tables']['leads']['Update'] = {
      status: 'trial',
    };
    await supabaseServer()
      .from('leads')
      .update(leadPatch)
      .eq('id', input.leadId)
      .eq('tenant_id', input.tenantId);

    return data;
  }

  async createPendingFollowup(input: CreatePendingFollowupInput): Promise<{ id: string }> {
    return this.followupStore.createPendingFollowup(input);
  }

  async listUpcomingTrials(tenantId: string, withinHours: number): Promise<ScheduledTrialRecord[]> {
    const now = new Date();
    const horizon = new Date(now.getTime() + withinHours * 60 * 60 * 1000);
    const today = slotDateFromIso(now.toISOString());
    const horizonDate = slotDateFromIso(horizon.toISOString());

    const { data, error } = await supabaseServer()
      .from('trial_classes')
      .select('id, lead_id, scheduled_date, scheduled_time, status')
      .eq('tenant_id', tenantId)
      .in('status', ACTIVE_TRIAL_STATUSES)
      .gte('scheduled_date', today)
      .lte('scheduled_date', horizonDate)
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  async findTrialById(
    trialClassId: string,
    tenantId: string
  ): Promise<ScheduledTrialRecord | null> {
    const { data, error } = await supabaseServer()
      .from('trial_classes')
      .select('id, lead_id, scheduled_date, scheduled_time, status')
      .eq('id', trialClassId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) throw error;
    return data ?? null;
  }

  async getLeadContact(
    leadId: string,
    tenantId: string
  ): Promise<{ name: string; twenty_person_id: string | null } | null> {
    const { data, error } = await supabaseServer()
      .from('leads')
      .select('name, twenty_person_id')
      .eq('id', leadId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return { name: data.name, twenty_person_id: data.twenty_person_id };
  }
}

export function createSupabaseTrialSchedulingStore(): TrialSchedulingStore {
  return new SupabaseTrialSchedulingStore();
}

export function slotPartsFromIso(iso: string): { scheduledDate: string; scheduledTime: string } {
  return {
    scheduledDate: slotDateFromIso(iso),
    scheduledTime: slotTimeFromIso(iso),
  };
}
