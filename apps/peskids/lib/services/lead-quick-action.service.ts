import { supabaseServer } from '@/lib/supabase';
import { getLeadForAdmin, updateLeadForAdmin } from '@/lib/services/lead-admin.service';
import { createTrialClass } from '@/lib/services/trial-class.service';

type QuickActionInput = {
  leadId: string;
  action: 'mark_attended' | 'hold' | 'cancel';
  teacherName?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  holdUntilMonth?: string;
  reason?: string;
};

type QuickActionResult = {
  ok: boolean;
  error?: string;
  status?: number;
  trialClassId?: string;
};

type AuditAction = 'status_change' | 'teacher_assign' | 'hold' | 'cancel';

type LeadStatusAuditInsert = {
  tenant_slug: string;
  lead_id: string;
  old_status: string | null;
  new_status: string;
  action: AuditAction;
  metadata: Record<string, unknown>;
};

function tenantSlug(): string {
  return (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();
}

// lead_status_audit predates the next `db:codegen` run, so the typed Database
// client doesn't know it yet — same escape hatch as lead-admin.service.ts's platformFrom().
function auditTable() {
  const client = supabaseServer() as unknown as {
    from: (tableName: string) => {
      insert: (row: LeadStatusAuditInsert) => Promise<{ error: { message: string } | null }>;
    };
  };
  return client.from('lead_status_audit');
}

async function recordAudit(input: {
  leadId: string;
  oldStatus: string | null;
  newStatus: string;
  action: AuditAction;
  metadata: Record<string, unknown>;
}): Promise<void> {
  const { error } = await auditTable().insert({
    tenant_slug: tenantSlug(),
    lead_id: input.leadId,
    old_status: input.oldStatus,
    new_status: input.newStatus,
    action: input.action,
    metadata: input.metadata,
  });

  if (error) {
    // Audit is best-effort; never block the underlying lead/trial mutation on it.
    console.warn('lead_status_audit insert failed', { error, lead_id: input.leadId });
  }
}

export async function postPeskidsLeadQuickAction(
  input: QuickActionInput
): Promise<QuickActionResult> {
  try {
    const slug = tenantSlug();
    const lead = await getLeadForAdmin(input.leadId, slug);

    if (!lead) {
      return { ok: false, error: 'Lead not found', status: 404 };
    }

    const oldStatus = lead.status;

    if (input.action === 'mark_attended') {
      if (input.teacherName && input.scheduledDate && input.scheduledTime) {
        const trial = await createTrialClass({
          lead_id: input.leadId,
          scheduled_date: input.scheduledDate,
          scheduled_time: input.scheduledTime,
          modality: lead.class_modality ?? 'llanogrande',
          teacher_name: input.teacherName,
        });

        await recordAudit({
          leadId: input.leadId,
          oldStatus,
          newStatus: 'trial',
          action: 'teacher_assign',
          metadata: {
            trial_class_id: trial.id,
            teacher_name: input.teacherName,
            scheduled_date: input.scheduledDate,
            scheduled_time: input.scheduledTime,
            reason: input.reason || 'marked_attended',
          },
        });

        return { ok: true, trialClassId: trial.id };
      }

      const updated = await updateLeadForAdmin(input.leadId, slug, { status: 'contacted' });
      if (!updated) {
        return { ok: false, error: 'Failed to update lead', status: 400 };
      }

      await recordAudit({
        leadId: input.leadId,
        oldStatus,
        newStatus: 'contacted',
        action: 'status_change',
        metadata: { reason: input.reason || 'marked_attended' },
      });

      return { ok: true };
    }

    if (input.action === 'hold') {
      const holdNote = `[HOLD] Próximo contacto: ${input.holdUntilMonth || 'próximo mes'}`;
      const currentNotes = lead.admin_notes ?? '';
      const updatedNotes = currentNotes ? `${currentNotes}\n${holdNote}` : holdNote;

      const updated = await updateLeadForAdmin(input.leadId, slug, {
        status: 'contacted',
        admin_notes: updatedNotes,
      });
      if (!updated) {
        return { ok: false, error: 'Failed to update lead', status: 400 };
      }

      await recordAudit({
        leadId: input.leadId,
        oldStatus,
        newStatus: 'contacted',
        action: 'hold',
        metadata: { hold_until_month: input.holdUntilMonth, reason: input.reason },
      });

      return { ok: true };
    }

    if (input.action === 'cancel') {
      const updated = await updateLeadForAdmin(input.leadId, slug, { status: 'archived' });
      if (!updated) {
        return { ok: false, error: 'Failed to update lead', status: 400 };
      }

      await recordAudit({
        leadId: input.leadId,
        oldStatus,
        newStatus: 'archived',
        action: 'cancel',
        metadata: { reason: input.reason || 'manual_cancel' },
      });

      return { ok: true };
    }

    return { ok: false, error: 'Unknown action', status: 400 };
  } catch (error) {
    console.error('Lead quick-action service error:', error);
    return { ok: false, error: 'Internal server error', status: 500 };
  }
}
