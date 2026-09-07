/**
 * Canonical Peskids customer journey.
 *
 * Trial class is NOT a business stage. Leftover `trial.*` emitters and
 * `trial_classes` rows are non-canonical and must not drive AI Board jobs.
 *
 * Staff UX: context already prepared + one decision + one WhatsApp button.
 * WhatsApp stays LEVEL 2 (prepare draft). Do not auto-send.
 */

export const PESKIDS_JOURNEY_STAGES = [
  'LEAD',
  'ENROLLMENT_FORM',
  'ENROLLMENT',
  'FIRST_CLASS',
  'CLASS_ATTENDANCE',
  'CLASS_REMINDERS',
  'TEACHER_FEEDBACK',
  'STUDENT_PROGRESS',
  'FAMILY_FEEDBACK',
  'CONTINUITY',
] as const;
export type PeskidsJourneyStage = (typeof PESKIDS_JOURNEY_STAGES)[number];

export const PESKIDS_PIPELINE_STAGE_CANONICAL = [
  'New Lead',
  'Contacted',
  'Enrollment',
  'Enrolled',
  'Active Student',
  'Renewal',
  'Lost',
] as const;
export type PeskidsCanonicalPipelineStage =
  (typeof PESKIDS_PIPELINE_STAGE_CANONICAL)[number];

/** Legacy CRM labels that must normalize to Enrollment, never stay as product truth. */
export const PESKIDS_TRIAL_STAGE_ALIASES = ['Trial Class', 'trial', 'qualified'] as const;

export const PESKIDS_LEAD_SOURCES = [
  'instagram',
  'website',
  'whatsapp',
  'qr',
  'referral',
  'ads',
] as const;
export type PeskidsLeadSource = (typeof PESKIDS_LEAD_SOURCES)[number];

export const PESKIDS_CANONICAL_EVENTS = [
  'lead.created',
  'lead.contacted',
  'enrollment.link.prepared',
  'enrollment.link.opened',
  'enrollment.link.sent',
  'enrollment.form.submitted',
  'family.created',
  'student.created',
  'student.enrolled',
  'first_class.scheduled',
  'class.scheduled',
  'class.reminder.created',
  'class.attended',
  'class.absent',
  'class.cancelled',
  'teacher.feedback.created',
  'student.progress.updated',
  'family.feedback.created',
  'family.contact_requested',
  'whatsapp.draft.created',
  'whatsapp.opened',
  'whatsapp.sent_confirmed',
  'followup.created',
  'followup.completed',
] as const;
export type PeskidsCanonicalEvent = (typeof PESKIDS_CANONICAL_EVENTS)[number];

export const PESKIDS_DEPRECATED_TRIAL_EVENTS = [
  'trial.scheduled',
  'trial.reminder',
  'trial.completed',
  'post_trial_followup',
  'trial.no_show',
] as const;
export type PeskidsDeprecatedTrialEvent =
  (typeof PESKIDS_DEPRECATED_TRIAL_EVENTS)[number];

export const PESKIDS_WHATSAPP_TEMPLATE_FAMILIES = [
  'NEW_LEAD',
  'ENROLLMENT_LINK',
  'ENROLLMENT_INCOMPLETE',
  'ENROLLMENT_CONFIRMED',
  'FIRST_CLASS_REMINDER',
  'CLASS_REMINDER',
  'ABSENCE_FOLLOWUP',
  'TEACHER_FEEDBACK_PENDING',
  'PROGRESS_AVAILABLE',
  'FAMILY_FEEDBACK_REQUEST',
  'FAMILY_CONTACT_REQUEST',
  'CONTINUITY_FOLLOWUP',
] as const;
export type PeskidsWhatsappTemplateFamily =
  (typeof PESKIDS_WHATSAPP_TEMPLATE_FAMILIES)[number];

export const PESKIDS_GOLDEN_FLOW_EVENTS: readonly PeskidsCanonicalEvent[] = [
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
] as const;

export function isCanonicalPeskidsEvent(eventType: string): eventType is PeskidsCanonicalEvent {
  return (PESKIDS_CANONICAL_EVENTS as readonly string[]).includes(eventType);
}

export function isDeprecatedTrialEvent(eventType: string): eventType is PeskidsDeprecatedTrialEvent {
  return (PESKIDS_DEPRECATED_TRIAL_EVENTS as readonly string[]).includes(eventType);
}

export function normalizePeskidsLeadSource(raw: string | null | undefined): PeskidsLeadSource | 'other' {
  const value = (raw ?? '').trim().toLowerCase();
  if (['instagram', 'ig', 'insta'].includes(value)) return 'instagram';
  if (['website', 'web', 'site', 'direct', 'organic'].includes(value)) return 'website';
  if (['whatsapp', 'wa', 'wsp'].includes(value)) return 'whatsapp';
  if (['qr', 'qr_code', 'codigo qr'].includes(value)) return 'qr';
  if (['referral', 'friend', 'recomendacion', 'recomendación'].includes(value)) {
    return 'referral';
  }
  if (['ads', 'ad', 'paid', 'meta_ads', 'google_ads'].includes(value)) return 'ads';
  return 'other';
}

export function whatsappTemplateForEvent(
  eventType: string
): PeskidsWhatsappTemplateFamily | null {
  switch (eventType) {
    case 'lead.created':
      return 'NEW_LEAD';
    case 'enrollment.link.prepared':
    case 'enrollment.link.opened':
    case 'enrollment.link.sent':
      return 'ENROLLMENT_LINK';
    case 'enrollment.form.submitted':
    case 'student.enrolled':
      return 'ENROLLMENT_CONFIRMED';
    case 'first_class.scheduled':
      return 'FIRST_CLASS_REMINDER';
    case 'class.scheduled':
    case 'class.reminder.created':
      return 'CLASS_REMINDER';
    case 'class.absent':
      return 'ABSENCE_FOLLOWUP';
    case 'teacher.feedback.created':
      return 'TEACHER_FEEDBACK_PENDING';
    case 'student.progress.updated':
      return 'PROGRESS_AVAILABLE';
    case 'family.feedback.created':
      return 'FAMILY_FEEDBACK_REQUEST';
    case 'family.contact_requested':
      return 'FAMILY_CONTACT_REQUEST';
    case 'followup.created':
      return 'CONTINUITY_FOLLOWUP';
    default:
      return null;
  }
}

export type WhatsappChannelAction =
  | 'draft_prepared'
  | 'wa_me_opened'
  | 'provider_confirmed_sent';

/**
 * Opening WhatsApp (wa.me) is not a confirmed send.
 * Only a provider/human confirmation may record `whatsapp.sent_confirmed`.
 */
export function whatsappEventForChannelAction(
  action: WhatsappChannelAction
): 'whatsapp.draft.created' | 'whatsapp.opened' | 'whatsapp.sent_confirmed' {
  switch (action) {
    case 'draft_prepared':
      return 'whatsapp.draft.created';
    case 'wa_me_opened':
      return 'whatsapp.opened';
    case 'provider_confirmed_sent':
      return 'whatsapp.sent_confirmed';
  }
}

export function isConfirmedWhatsappSend(eventType: string): boolean {
  return eventType === 'whatsapp.sent_confirmed';
}

export function nextStaffActionForEvent(eventType: string): string {
  switch (eventType) {
    case 'lead.created':
    case 'lead.contacted':
    case 'enrollment.link.prepared':
    case 'enrollment.link.opened':
    case 'enrollment.link.sent':
      return 'SEND_ENROLLMENT_LINK';
    case 'enrollment.form.submitted':
    case 'student.enrolled':
      return 'CONFIRM_ENROLLMENT';
    case 'first_class.scheduled':
    case 'class.reminder.created':
    case 'class.scheduled':
      return 'SEND_CLASS_REMINDER';
    case 'class.absent':
      return 'SEND_ABSENCE_FOLLOWUP';
    case 'class.attended':
      return 'CAPTURE_TEACHER_FEEDBACK';
    case 'teacher.feedback.created':
    case 'student.progress.updated':
      return 'SHARE_PROGRESS_WITH_FAMILY';
    case 'family.contact_requested':
      return 'CONTACT_FAMILY';
    default:
      return 'REVIEW_CONTEXT';
  }
}
