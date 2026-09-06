import { supabaseServer } from '@/lib/supabase';
import type { Database } from '@/lib/types';
import { getLeadForAdmin } from '@/lib/services/lead-admin.service';
import { getStudentById } from '@/lib/services/student.service';
import type { createFollowupSchema, patchFollowupSchema } from '@/lib/validation/followup.schema';
import { createTwentyTaskForLeadFollowup, syncTwentyTaskStatus } from '@/lib/twenty-followup-sync';
import { sendNotification } from '@/lib/notifications';
import { emitFollowupCompleted, emitFollowupCreated } from '@/lib/events';
import { dateOneMonthFrom } from '@/lib/admin/lead-followup-actions';
import type { z } from 'zod';

export type FollowupRow = Database['public']['Tables']['followups']['Row'];

export type FollowupWithContact = FollowupRow & {
  contact_name: string | null;
};

function tenantSlug(): string {
  return (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();
}

async function resolveContactName(
  contactId: string,
  contactType: FollowupRow['contact_type']
): Promise<string | null> {
  if (contactType === 'lead') {
    const lead = await getLeadForAdmin(contactId, tenantSlug());
    return lead?.name ?? null;
  }
  if (contactType === 'student') {
    const student = await getStudentById(contactId);
    return student?.name ?? null;
  }
  return null;
}

async function withContactName(row: FollowupRow): Promise<FollowupWithContact> {
  return {
    ...row,
    contact_name: await resolveContactName(row.contact_id, row.contact_type),
  };
}

async function resolveContact(
  contactId: string,
  contactType: FollowupRow['contact_type']
): Promise<{ name: string | null; email: string | null; phone: string | null } | null> {
  if (contactType === 'lead') {
    const lead = await getLeadForAdmin(contactId, tenantSlug());
    if (!lead) return null;
    return { name: lead.name ?? null, email: lead.email ?? null, phone: lead.phone ?? null };
  }
  if (contactType === 'student') {
    const student = await getStudentById(contactId);
    if (!student) return null;
    return {
      name: student.name ?? null,
      email: student.parent_email ?? null,
      phone: student.parent_phone ?? null,
    };
  }
  // 'parent' contact type has no dedicated lookup yet — same gap as resolveContactName.
  return null;
}

export async function listFollowups(input?: {
  status?: FollowupRow['status'];
  contact_type?: FollowupRow['contact_type'];
  contact_id?: string;
}): Promise<FollowupWithContact[]> {
  let query = supabaseServer()
    .from('followups')
    .select('*')
    .eq('tenant_id', tenantSlug())
    .order('due_date', { ascending: true });

  if (input?.status) {
    query = query.eq('status', input.status);
  }
  if (input?.contact_type) {
    query = query.eq('contact_type', input.contact_type);
  }
  if (input?.contact_id) {
    query = query.eq('contact_id', input.contact_id);
  }

  const { data, error } = await query;
  if (error) throw error;

  return Promise.all((data ?? []).map(withContactName));
}

export async function createFollowup(
  input: z.infer<typeof createFollowupSchema>
): Promise<FollowupWithContact> {
  const { data, error } = await supabaseServer()
    .from('followups')
    .insert({
      tenant_id: tenantSlug(),
      contact_id: input.contact_id,
      contact_type: input.contact_type,
      type: input.type,
      due_date: input.due_date,
      notes: input.notes ?? null,
      status: 'pending',
    })
    .select('*')
    .single();

  if (error) throw error;

  void emitFollowupCreated({
    followupId: data.id,
    contactId: data.contact_id,
    contactType: data.contact_type,
    type: data.type,
    dueDate: data.due_date,
  }).catch((err: unknown) => {
    console.warn('[followup-admin] followup.created emit failed', {
      followup_id: data.id,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  // Best-effort: staff work entirely from this CRUD, never opening Twenty.
  // A lead-linked followup also gets a Twenty Task so the pipeline stays
  // complete for reporting. Failure here must never block the local write.
  if (input.contact_type === 'lead') {
    const twentyTaskId = await createTwentyTaskForLeadFollowup({
      followupId: data.id,
      leadId: input.contact_id,
      type: input.type,
      dueDate: input.due_date,
      notes: input.notes ?? null,
    });

    if (twentyTaskId) {
      const refreshed = await getFollowupById(data.id);
      if (refreshed) {
        return withContactName(refreshed);
      }
      data.twenty_task_id = twentyTaskId;
    }
  }

  return withContactName(data);
}

/**
 * Create the standard post-trial follow-up once per lead/date.
 * Retries return the existing pending task instead of adding an identical one.
 */
export async function createOneMonthLeadFollowup(leadId: string): Promise<FollowupWithContact> {
  const dueDate = dateOneMonthFrom(new Date());
  const notes = 'Contactar en 1 mes después de la clase de prueba.';
  const findExisting = async (): Promise<FollowupWithContact | null> => {
    const existing = await supabaseServer()
      .from('followups')
      .select('*')
      .eq('tenant_id', tenantSlug())
      .eq('contact_id', leadId)
      .eq('contact_type', 'lead')
      .eq('type', 'call')
      .eq('due_date', dueDate)
      .eq('status', 'pending')
      .eq('notes', notes)
      .limit(1)
      .maybeSingle();

    if (existing.error) throw existing.error;
    return existing.data ? withContactName(existing.data) : null;
  };

  const existing = await findExisting();
  if (existing) return existing;

  try {
    return await createFollowup({
      contact_id: leadId,
      contact_type: 'lead',
      type: 'call',
      due_date: dueDate,
      notes,
    });
  } catch (error) {
    // A concurrent retry may have won the unique partial index race.
    const concurrent = await findExisting();
    if (concurrent) return concurrent;
    throw error;
  }
}

export async function getFollowupById(followupId: string): Promise<FollowupRow | null> {
  const { data, error } = await supabaseServer()
    .from('followups')
    .select('*')
    .eq('id', followupId)
    .eq('tenant_id', tenantSlug())
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export async function updateFollowup(
  followupId: string,
  input: z.infer<typeof patchFollowupSchema>
): Promise<FollowupWithContact | null> {
  const existing = await getFollowupById(followupId);
  if (!existing) {
    return null;
  }

  const patch: Database['public']['Tables']['followups']['Update'] = {
    updated_at: new Date().toISOString(),
  };

  if (input.status !== undefined) patch.status = input.status;
  if (input.type !== undefined) patch.type = input.type;
  if (input.due_date !== undefined) patch.due_date = input.due_date;
  if (input.notes !== undefined) patch.notes = input.notes;

  const { data, error } = await supabaseServer()
    .from('followups')
    .update(patch)
    .eq('id', followupId)
    .eq('tenant_id', tenantSlug())
    .select('*')
    .single();

  if (error) throw error;

  if (input.status !== undefined && existing.contact_type === 'lead' && existing.twenty_task_id) {
    await syncTwentyTaskStatus(followupId, existing.twenty_task_id, input.status);
  }

  if (input.status === 'completed' && existing.status !== 'completed') {
    void emitFollowupCompleted({
      followupId: data.id,
      contactId: data.contact_id,
      contactType: data.contact_type,
    }).catch((err: unknown) => {
      console.warn('[followup-admin] followup.completed emit failed', {
        followup_id: data.id,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }

  return withContactName(data);
}

export interface ExecuteFollowupsResult {
  executed: string[];
  skipped: Array<{ id: string; reason: string }>;
  failed: Array<{ id: string; error: string }>;
}

const FOLLOWUP_TYPE_LABEL: Record<FollowupRow['type'], string> = {
  call: 'una llamada',
  email: 'un correo',
  sms: 'un mensaje',
  'in-person': 'una visita presencial',
};

async function fetchDueFollowups(dueDate: string): Promise<FollowupRow[]> {
  const { data, error } = await supabaseServer()
    .from('followups')
    .select('*')
    .eq('tenant_id', tenantSlug())
    .eq('status', 'pending')
    .lte('due_date', dueDate)
    .order('due_date', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Notifies the contact for every followup due today or earlier, then marks it
 * completed (which also syncs the linked Twenty task to DONE). Meant to be
 * driven by an hourly n8n cron via POST /api/admin/followups/execute.
 *
 * Queries only due rows (rather than reusing listFollowups) and resolves each
 * contact inside its own try/catch — listFollowups resolves contact_name for
 * every row via a shared Promise.all, so one bad lookup would otherwise sink
 * the entire batch instead of just that followup.
 */
export async function executeDueFollowups(): Promise<ExecuteFollowupsResult> {
  const today = new Date().toISOString().slice(0, 10);
  const due = await fetchDueFollowups(today);

  const result: ExecuteFollowupsResult = { executed: [], skipped: [], failed: [] };

  for (const followup of due) {
    try {
      const contact = await resolveContact(followup.contact_id, followup.contact_type);
      if (!contact || (!contact.email && !contact.phone)) {
        result.skipped.push({ id: followup.id, reason: 'no contact channel' });
        continue;
      }

      await sendNotification({
        type: 'followup_due',
        recipientEmail: contact.email ?? undefined,
        recipientPhone: contact.phone ?? undefined,
        title: 'Seguimiento pendiente — Peskids',
        body:
          followup.notes?.trim() ||
          `Tienes ${FOLLOWUP_TYPE_LABEL[followup.type]} de seguimiento pendiente con ${contact.name ?? 'un contacto'}.`,
        metadata: { followup_id: followup.id, contact_type: followup.contact_type },
        tenantSlug: tenantSlug(),
      });

      await updateFollowup(followup.id, { status: 'completed' });
      result.executed.push(followup.id);
    } catch (err) {
      result.failed.push({
        id: followup.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return result;
}
