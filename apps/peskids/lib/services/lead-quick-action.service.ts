import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

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
  studentId?: string;
  trialClassId?: string;
};

export async function postPeskidsLeadQuickAction(
  input: QuickActionInput
): Promise<QuickActionResult> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', input.leadId)
      .eq('tenant_id', 'peskids')
      .single();

    if (leadError || !lead) {
      return { ok: false, error: 'Lead not found', status: 404 };
    }

    const oldStatus = lead.status;

    // 2. Handle actions
    if (input.action === 'mark_attended') {
      // Create student + trial class
      const { data: student, error: studentError } = await supabase
        .from('students')
        .insert({
          tenant_id: 'peskids',
          name: lead.name,
          grade: lead.grade_interested || 'N/A',
          status: 'active',
          parent_email: lead.email,
          source_lead_id: input.leadId,
        })
        .select('id')
        .single();

      if (studentError || !student) {
        return { ok: false, error: 'Failed to create student', status: 400 };
      }

      // Create trial class if teacher + date provided
      if (input.teacherName && input.scheduledDate && input.scheduledTime) {
        const { data: trialClass, error: trialError } = await supabase
          .from('trial_classes')
          .insert({
            tenant_id: 'peskids',
            lead_id: input.leadId,
            student_id: student.id,
            scheduled_date: input.scheduledDate,
            scheduled_time: input.scheduledTime,
            modality: lead.class_modality || 'llanogrande',
            teacher_name: input.teacherName,
            status: 'scheduled',
          })
          .select('id')
          .single();

        if (trialError) {
          console.warn('Trial class creation warning:', trialError);
        }

        // Record audit
        await supabase.from('lead_status_audit').insert({
          tenant_slug: 'peskids',
          lead_id: input.leadId,
          old_status: oldStatus,
          new_status: 'contacted',
          action: 'teacher_assign',
          metadata: {
            student_id: student.id,
            trial_class_id: trialClass?.id,
            teacher_name: input.teacherName,
            scheduled_date: input.scheduledDate,
            scheduled_time: input.scheduledTime,
            reason: input.reason || 'marked_attended',
          },
        });

        return {
          ok: true,
          studentId: student.id,
          trialClassId: trialClass?.id,
        };
      }

      // No trial class, just mark attended
      await supabase.from('lead_status_audit').insert({
        tenant_slug: 'peskids',
        lead_id: input.leadId,
        old_status: oldStatus,
        new_status: 'contacted',
        action: 'status_change',
        metadata: { reason: 'marked_attended', student_id: student.id },
      });

      return {
        ok: true,
        studentId: student.id,
      };
    }

    if (input.action === 'hold') {
      // Update lead status to 'contacted' but add hold note
      const holdNote = `[HOLD] Próximo contacto: ${input.holdUntilMonth || 'próximo mes'}`;
      const currentNotes = lead.admin_notes || '';
      const updatedNotes = currentNotes
        ? `${currentNotes}\n${holdNote}`
        : holdNote;

      const { error: updateError } = await supabase
        .from('leads')
        .update({
          status: 'contacted',
          admin_notes: updatedNotes,
        })
        .eq('id', input.leadId);

      if (updateError) {
        return { ok: false, error: 'Failed to update lead', status: 400 };
      }

      // Record audit
      await supabase.from('lead_status_audit').insert({
        tenant_slug: 'peskids',
        lead_id: input.leadId,
        old_status: oldStatus,
        new_status: 'contacted',
        action: 'hold',
        metadata: { hold_until_month: input.holdUntilMonth, reason: input.reason },
      });

      return { ok: true };
    }

    if (input.action === 'cancel') {
      const { error: updateError } = await supabase
        .from('leads')
        .update({ status: 'archived' })
        .eq('id', input.leadId);

      if (updateError) {
        return { ok: false, error: 'Failed to update lead', status: 400 };
      }

      // Record audit
      await supabase.from('lead_status_audit').insert({
        tenant_slug: 'peskids',
        lead_id: input.leadId,
        old_status: oldStatus,
        new_status: 'archived',
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
