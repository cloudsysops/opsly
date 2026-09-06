import { getLeadForAdmin, updateLeadForAdmin } from '@/lib/services/lead-admin.service';
import { createTrialClass, hasAttendedTrialClass } from '@/lib/services/trial-class.service';
import { createOneMonthLeadFollowup } from '@/lib/services/followup-admin.service';
import { recordLeadStatusAudit } from '@/lib/services/lead-status-audit.service';

type QuickActionInput = {
  leadId: string;
  action: 'mark_attended' | 'mark_enrolled' | 'follow_up_month' | 'hold' | 'cancel';
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

function tenantSlug(): string {
  return (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();
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

        await recordLeadStatusAudit({
          leadId: input.leadId,
          oldStatus,
          newStatus: 'trial',
          action: 'teacher_assign',
          metadata: {
            trial_class_id: trial.id,
            teacher_name: input.teacherName,
            scheduled_date: input.scheduledDate,
            scheduled_time: input.scheduledTime,
            reason: input.reason || 'class_scheduled',
          },
        });

        return { ok: true, trialClassId: trial.id };
      }

      const updated = await updateLeadForAdmin(input.leadId, slug, { status: 'contacted' });
      if (!updated) {
        return { ok: false, error: 'Failed to update lead', status: 400 };
      }

      await recordLeadStatusAudit({
        leadId: input.leadId,
        oldStatus,
        newStatus: 'contacted',
        action: 'status_change',
        metadata: { reason: input.reason || 'marked_attended' },
      });

      return { ok: true };
    }

    if (input.action === 'mark_enrolled') {
      if (oldStatus !== 'trial') {
        return { ok: false, error: 'Lead must have a trial class before enrollment', status: 409 };
      }
      const updated = await updateLeadForAdmin(input.leadId, slug, { status: 'enrolled' });
      if (!updated) {
        return { ok: false, error: 'Failed to update lead', status: 400 };
      }

      await recordLeadStatusAudit({
        leadId: input.leadId,
        oldStatus,
        newStatus: 'enrolled',
        action: 'status_change',
        metadata: { reason: input.reason || 'marked_enrolled' },
      });

      return { ok: true };
    }

    if (input.action === 'follow_up_month') {
      if (oldStatus !== 'trial') {
        return { ok: false, error: 'Lead must have a trial class before follow-up', status: 409 };
      }
      if (!(await hasAttendedTrialClass(input.leadId))) {
        return {
          ok: false,
          error: 'La primera clase debe estar marcada como asistida antes del seguimiento',
          status: 409,
        };
      }
      const followup = await createOneMonthLeadFollowup(input.leadId);
      await recordAudit({
        leadId: input.leadId,
        oldStatus,
        newStatus: oldStatus ?? 'trial',
        action: 'status_change',
        metadata: { followup_id: followup.id, reason: input.reason || 'follow_up_month' },
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

      await recordLeadStatusAudit({
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

      await recordLeadStatusAudit({
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
