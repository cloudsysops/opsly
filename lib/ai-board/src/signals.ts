import { isDeprecatedTrialEvent } from './peskids-journey.js';
import type { BoardSignal, DomainEvent, EntityKind, SignalType } from './types.js';

function readId(data: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function truthy(data: Record<string, unknown>, key: string): boolean {
  return data[key] === true || data[key] === 'true' || data[key] === 1;
}

function occurredAt(event: DomainEvent): string {
  if (typeof event.occurred_at === 'string' && event.occurred_at.length > 0) {
    return event.occurred_at;
  }
  return new Date().toISOString();
}

function signal(
  event: DomainEvent,
  type: SignalType,
  entityKind: EntityKind,
  entityId: string,
  refs: Record<string, string>
): BoardSignal {
  return {
    type,
    tenant_slug: event.tenant_slug,
    entity_kind: entityKind,
    entity_id: entityId,
    occurred_at: occurredAt(event),
    request_id: event.request_id,
    refs,
  };
}

function mapLeadCreated(event: DomainEvent): BoardSignal[] {
  const leadId = readId(event.data, ['lead_id', 'entity_id']);
  if (!leadId) {
    return [];
  }
  const hot = truthy(event.data, 'hot') || truthy(event.data, 'has_phone');
  if (!hot) {
    return [];
  }
  return [signal(event, 'HOT_LEAD_CREATED', 'lead', leadId, { lead_id: leadId })];
}

function mapFollowupOverdue(event: DomainEvent): BoardSignal[] {
  const followupId = readId(event.data, ['followup_id', 'entity_id']);
  const leadId = readId(event.data, ['lead_id', 'contact_id']);
  if (!followupId && !leadId) {
    return [];
  }
  const refs: Record<string, string> = {};
  if (followupId) refs.followup_id = followupId;
  if (leadId) refs.lead_id = leadId;
  if (truthy(event.data, 'hot') && leadId) {
    return [signal(event, 'HOT_LEAD_UNATTENDED', 'lead', leadId, refs)];
  }
  return [signal(event, 'FOLLOWUP_OVERDUE', 'followup', followupId ?? leadId ?? '', refs)];
}

function mapSimple(
  event: DomainEvent,
  type: SignalType,
  kind: EntityKind,
  idKeys: string[]
): BoardSignal[] {
  const entityId = readId(event.data, idKeys);
  if (!entityId) {
    return [];
  }
  return [signal(event, type, kind, entityId, { [`${kind}_id`]: entityId })];
}

export function mapDomainEventToSignals(event: DomainEvent): BoardSignal[] {
  if (isDeprecatedTrialEvent(event.event_type)) {
    return [];
  }

  switch (event.event_type) {
    case 'lead.created':
      return mapLeadCreated(event);
    case 'followup.overdue':
    case 'lead.unattended':
      return mapFollowupOverdue(event);
    case 'enrollment.link.created':
    case 'enrollment.link.prepared':
    case 'enrollment.link.sent':
    case 'enrollment.incomplete':
      return mapSimple(event, 'ENROLLMENT_INCOMPLETE', 'lead', ['lead_id', 'entity_id']);
    case 'enrollment.form.submitted':
    case 'student.enrolled':
      return mapSimple(event, 'ENROLLMENT_SUBMITTED', 'enrollment', [
        'enrollment_id',
        'student_id',
        'lead_id',
        'entity_id',
      ]);
    case 'first_class.scheduled':
      return mapSimple(event, 'FIRST_CLASS_SCHEDULED', 'class', [
        'class_id',
        'student_id',
        'entity_id',
      ]);
    case 'class.scheduled':
      return truthy(event.data, 'first_class')
        ? mapSimple(event, 'FIRST_CLASS_SCHEDULED', 'class', ['class_id', 'student_id', 'entity_id'])
        : mapSimple(event, 'CLASS_REMINDER_DUE', 'class', ['class_id', 'entity_id']);
    case 'class.reminder.created':
      return mapSimple(event, 'CLASS_REMINDER_DUE', 'class', ['class_id', 'reminder_id', 'entity_id']);
    case 'class.attended':
      return mapSimple(event, 'CLASS_ATTENDED', 'class', ['class_id', 'attendance_id', 'entity_id']);
    case 'class.absent':
      return mapSimple(event, 'CLASS_ABSENT', 'class', ['class_id', 'attendance_id', 'entity_id']);
    case 'teacher.feedback.created':
    case 'student.progress.updated':
      return mapSimple(event, 'STUDENT_PROGRESS_UPDATED', 'feedback', [
        'feedback_id',
        'student_id',
        'entity_id',
      ]);
    case 'family.feedback.created':
      return mapSimple(event, 'FAMILY_FEEDBACK_RECEIVED', 'feedback', [
        'feedback_id',
        'family_id',
        'entity_id',
      ]);
    case 'family.contact_requested':
      return mapSimple(event, 'FAMILY_CONTACT_REQUESTED', 'lead', [
        'lead_id',
        'family_id',
        'entity_id',
      ]);
    case 'lead.no_response':
      return mapSimple(event, 'LEAD_NO_RESPONSE', 'lead', ['lead_id', 'entity_id']);
    case 'automation.failed':
      return mapSimple(event, 'AUTOMATION_FAILED', 'automation', [
        'automation_id',
        'delivery_id',
        'entity_id',
      ]);
    case 'whatsapp.draft_ready':
    case 'whatsapp.draft.created':
    case 'message.draft_ready':
      return mapSimple(event, 'WHATSAPP_DRAFT_READY', 'message', [
        'message_id',
        'entity_id',
      ]);
    default:
      return [];
  }
}
