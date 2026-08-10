import type { Database } from '@/lib/types';
import { supabaseServer } from '@/lib/supabase';

export type FollowupLeadRecord = Pick<
  Database['public']['Tables']['leads']['Row'],
  | 'id'
  | 'tenant_id'
  | 'name'
  | 'email'
  | 'phone'
  | 'grade_interested'
  | 'class_modality'
  | 'neighborhood'
  | 'status'
  | 'twenty_person_id'
  | 'created_at'
>;

export type ReengagementLeadCandidate = {
  lead: FollowupLeadRecord;
  daysSinceContact: number;
};

export type CreatePendingFollowupInput = {
  tenantId: string;
  leadId: string;
  type: Database['public']['Tables']['followups']['Row']['type'];
  notes: string;
  dueDate?: string;
};

export interface LeadFollowupStore {
  findStaleLeads(hoursThreshold: number, tenantId: string): Promise<FollowupLeadRecord[]>;
  findReengagementCandidates(
    minDays: number,
    maxDays: number,
    tenantId: string
  ): Promise<ReengagementLeadCandidate[]>;
  createPendingFollowup(input: CreatePendingFollowupInput): Promise<{ id: string }>;
}

const LEAD_SELECT =
  'id, tenant_id, name, email, phone, grade_interested, class_modality, neighborhood, status, twenty_person_id, created_at';

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export class SupabaseLeadFollowupStore implements LeadFollowupStore {
  async findStaleLeads(hoursThreshold: number, tenantId: string): Promise<FollowupLeadRecord[]> {
    const cutoff = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabaseServer()
      .from('leads')
      .select(LEAD_SELECT)
      .eq('tenant_id', tenantId)
      .eq('status', 'new')
      .lt('created_at', cutoff)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) {
      throw error;
    }

    return (data ?? []) as FollowupLeadRecord[];
  }

  async findReengagementCandidates(
    minDays: number,
    maxDays: number,
    tenantId: string
  ): Promise<ReengagementLeadCandidate[]> {
    const now = Date.now();
    const minCutoff = new Date(now - maxDays * 24 * 60 * 60 * 1000).toISOString();
    const maxCutoff = new Date(now - minDays * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabaseServer()
      .from('leads')
      .select(LEAD_SELECT)
      .eq('tenant_id', tenantId)
      .in('status', ['new', 'contacted'])
      .gte('created_at', minCutoff)
      .lte('created_at', maxCutoff)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    return (data ?? []).map((lead) => ({
      lead: lead as FollowupLeadRecord,
      daysSinceContact: Math.floor(
        (now - new Date(lead.created_at).getTime()) / (24 * 60 * 60 * 1000)
      ),
    }));
  }

  async createPendingFollowup(input: CreatePendingFollowupInput): Promise<{ id: string }> {
    const { data, error } = await supabaseServer()
      .from('followups')
      .insert({
        tenant_id: input.tenantId,
        contact_id: input.leadId,
        contact_type: 'lead',
        type: input.type,
        due_date: input.dueDate ?? toIsoDate(new Date()),
        status: 'pending',
        notes: input.notes,
      })
      .select('id')
      .single();

    if (error || !data?.id) {
      throw error ?? new Error('followup insert failed');
    }

    return { id: data.id };
  }
}

export function createSupabaseLeadFollowupStore(): LeadFollowupStore {
  return new SupabaseLeadFollowupStore();
}
