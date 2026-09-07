import { describe, expect, it } from 'vitest';
import { ingestDomainEvent } from './pipeline.js';
import {
  PESKIDS_GOLDEN_FLOW_EVENTS,
  PESKIDS_JOURNEY_STAGES,
  PESKIDS_WHATSAPP_TEMPLATE_FAMILIES,
  isConfirmedWhatsappSend,
  isDeprecatedTrialEvent,
  nextStaffActionForEvent,
  whatsappEventForChannelAction,
  whatsappTemplateForEvent,
} from './peskids-journey.js';

describe('Peskids canonical journey', () => {
  it('does not treat trial class as a journey stage', () => {
    expect(PESKIDS_JOURNEY_STAGES).not.toContain('TRIAL');
    expect(PESKIDS_WHATSAPP_TEMPLATE_FAMILIES.every((name) => !name.includes('TRIAL'))).toBe(
      true
    );
    expect(isDeprecatedTrialEvent('trial.scheduled')).toBe(true);
    expect(isDeprecatedTrialEvent('post_trial_followup')).toBe(true);
  });

  it('ignores leftover trial events in AI Board mapping', () => {
    for (const eventType of ['trial.scheduled', 'trial.completed', 'trial.reminder']) {
      const result = ingestDomainEvent({
        event_type: eventType,
        tenant_slug: 'peskids',
        data: { trial_id: 'trial-1', trial_tomorrow: true },
      });
      expect(result.ok).toBe(true);
      expect(result.signals).toEqual([]);
      expect(result.jobs).toEqual([]);
    }
  });

  it('proves the golden flow: lead → enrollment → first class → attendance → feedback', () => {
    expect(PESKIDS_GOLDEN_FLOW_EVENTS).toEqual([
      'lead.created',
      'lead.contacted',
      'enrollment.link.sent',
      'enrollment.form.submitted',
      'family.created',
      'student.created',
      'student.enrolled',
      'first_class.scheduled',
      'class.reminder.created',
      'class.attended',
      'teacher.feedback.created',
      'student.progress.updated',
      'family.feedback.created',
    ]);

    const lead = ingestDomainEvent({
      event_type: 'lead.created',
      tenant_slug: 'peskids',
      data: { lead_id: 'lead-1', has_phone: true },
    });
    expect(lead.jobs[0]?.job_type).toBe('SEND_ENROLLMENT_LINK');
    expect(lead.jobs[0]?.automation_level).toBe(2);
    expect(lead.jobs[0]?.execute_external).toBe(false);
    expect(whatsappTemplateForEvent('lead.created')).toBe('NEW_LEAD');
    expect(nextStaffActionForEvent('lead.created')).toBe('SEND_ENROLLMENT_LINK');

    const link = ingestDomainEvent({
      event_type: 'enrollment.link.sent',
      tenant_slug: 'peskids',
      data: { lead_id: 'lead-1' },
    });
    expect(link.jobs[0]?.job_type).toBe('SEND_ENROLLMENT_LINK');
    expect(whatsappTemplateForEvent('enrollment.link.sent')).toBe('ENROLLMENT_LINK');

    const enrolled = ingestDomainEvent({
      event_type: 'enrollment.form.submitted',
      tenant_slug: 'peskids',
      data: { enrollment_id: 'enr-1', lead_id: 'lead-1' },
    });
    expect(enrolled.signals[0]?.type).toBe('ENROLLMENT_SUBMITTED');
    expect(whatsappTemplateForEvent('enrollment.form.submitted')).toBe('ENROLLMENT_CONFIRMED');

    const firstClass = ingestDomainEvent({
      event_type: 'first_class.scheduled',
      tenant_slug: 'peskids',
      data: { class_id: 'class-1', student_id: 'stu-1' },
    });
    expect(firstClass.jobs[0]?.job_type).toBe('PREPARE_CLASS_REMINDER');
    expect(whatsappTemplateForEvent('first_class.scheduled')).toBe('FIRST_CLASS_REMINDER');

    const reminder = ingestDomainEvent({
      event_type: 'class.reminder.created',
      tenant_slug: 'peskids',
      data: { class_id: 'class-1' },
    });
    expect(reminder.jobs[0]?.job_type).toBe('PREPARE_CLASS_REMINDER');
    expect(reminder.jobs[0]?.execute_external).toBe(false);

    const attended = ingestDomainEvent({
      event_type: 'class.attended',
      tenant_slug: 'peskids',
      data: { class_id: 'class-1', attendance_id: 'att-1' },
    });
    expect(attended.jobs[0]?.job_type).toBe('REQUEST_TEACHER_FEEDBACK');

    const progress = ingestDomainEvent({
      event_type: 'teacher.feedback.created',
      tenant_slug: 'peskids',
      data: { feedback_id: 'fb-1', student_id: 'stu-1' },
    });
    expect(progress.jobs[0]?.job_type).toBe('REQUEST_FAMILY_FEEDBACK');
    expect(whatsappTemplateForEvent('student.progress.updated')).toBe('PROGRESS_AVAILABLE');
  });

  it('does not record whatsapp.sent when staff only opened WhatsApp', () => {
    expect(whatsappEventForChannelAction('draft_prepared')).toBe('whatsapp.draft.created');
    expect(whatsappEventForChannelAction('wa_me_opened')).toBe('whatsapp.opened');
    expect(whatsappEventForChannelAction('provider_confirmed_sent')).toBe(
      'whatsapp.sent_confirmed'
    );
    expect(isConfirmedWhatsappSend('whatsapp.opened')).toBe(false);
    expect(isConfirmedWhatsappSend('whatsapp.draft.created')).toBe(false);
    expect(isConfirmedWhatsappSend('whatsapp.sent')).toBe(false);
    expect(isConfirmedWhatsappSend('whatsapp.sent_confirmed')).toBe(true);
  });
});
