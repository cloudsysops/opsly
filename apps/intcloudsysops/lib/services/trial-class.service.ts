import { supabaseServer } from '@/lib/supabase';
import type { Database } from '@/lib/types';
import { getLeadForAdmin, updateLeadForAdmin } from '@/lib/services/lead-admin.service';
import type { createTrialClassSchema, patchTrialClassSchema } from '@/lib/validation/trial-class.schema';
import type { z } from 'zod';

export type TrialClassRow = Database['public']['Tables']['trial_classes']['Row'];

export type TrialClassWithLead = TrialClassRow & {
  lead_name: string | null;
  lead_email: string | null;
};

function tenantSlug(): string {
  return (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();
}

function normalizeTime(value: string): string {
  return value.length === 5 ? `${value}:00` : value;
}

export async function listTrialClasses(input?: {
  lead_id?: string;
  status?: TrialClassRow['status'];
}): Promise<TrialClassWithLead[]> {
  let query = supabaseServer()
    .from('trial_classes')
    .select('*')
    .eq('tenant_id', tenantSlug())
    .order('scheduled_date', { ascending: true })
    .order('scheduled_time', { ascending: true });

  if (input?.lead_id) {
    query = query.eq('lead_id', input.lead_id);
  }
  if (input?.status) {
    query = query.eq('status', input.status);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = data ?? [];
  const enriched = await Promise.all(
    rows.map(async (row) => {
      const lead = await getLeadForAdmin(row.lead_id, tenantSlug());
      return {
        ...row,
        lead_name: lead?.name ?? null,
        lead_email: lead?.email ?? null,
      };
    })
  );

  return enriched;
}

export async function createTrialClass(
  input: z.infer<typeof createTrialClassSchema>
): Promise<TrialClassWithLead> {
  const slug = tenantSlug();
  const lead = await getLeadForAdmin(input.lead_id, slug);
  if (!lead) {
    throw new Error('Lead not found');
  }

  const { data, error } = await supabaseServer()
    .from('trial_classes')
    .insert({
      tenant_id: slug,
      lead_id: input.lead_id,
      scheduled_date: input.scheduled_date,
      scheduled_time: normalizeTime(input.scheduled_time),
      modality: input.modality,
      teacher_name: input.teacher_name ?? null,
      notes: input.notes ?? null,
      status: 'scheduled',
    })
    .select('*')
    .single();

  if (error) throw error;

  if (lead.status !== 'enrolled' && lead.status !== 'archived') {
    await updateLeadForAdmin(input.lead_id, slug, { status: 'trial' });
  }

  return {
    ...data,
    lead_name: lead.name,
    lead_email: lead.email,
  };
}

export async function getTrialClassById(trialClassId: string): Promise<TrialClassRow | null> {
  const { data, error } = await supabaseServer()
    .from('trial_classes')
    .select('*')
    .eq('id', trialClassId)
    .eq('tenant_id', tenantSlug())
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export async function updateTrialClass(
  trialClassId: string,
  input: z.infer<typeof patchTrialClassSchema>
): Promise<TrialClassWithLead | null> {
  const existing = await getTrialClassById(trialClassId);
  if (!existing) {
    return null;
  }

  const patch: Database['public']['Tables']['trial_classes']['Update'] = {
    updated_at: new Date().toISOString(),
  };

  if (input.status !== undefined) patch.status = input.status;
  if (input.scheduled_date !== undefined) patch.scheduled_date = input.scheduled_date;
  if (input.scheduled_time !== undefined) {
    patch.scheduled_time = normalizeTime(input.scheduled_time);
  }
  if (input.modality !== undefined) patch.modality = input.modality;
  if (input.teacher_name !== undefined) patch.teacher_name = input.teacher_name;
  if (input.notes !== undefined) patch.notes = input.notes;

  const { data, error } = await supabaseServer()
    .from('trial_classes')
    .update(patch)
    .eq('id', trialClassId)
    .eq('tenant_id', tenantSlug())
    .select('*')
    .single();

  if (error) throw error;

  const lead = await getLeadForAdmin(data.lead_id, tenantSlug());
  return {
    ...data,
    lead_name: lead?.name ?? null,
    lead_email: lead?.email ?? null,
  };
}
