import { OpslyEvent } from './types';

/**
 * Catalog of domain events for the "Peskids Pro 1.0" program
 * (docs/tenants/peskids/PESKIDS-PRO-1.0-IMPLEMENTATION-PLAN.md).
 *
 * `lead.created` and `feedback.created`/`feedback.alert` below are already
 * emitted for real via `emitLeadCreated`/`emitFeedbackCreated`. The rest are
 * declared here as the target vocabulary so later PRs (PR-PRO-1, 3, 4, 9)
 * emit a name from this list instead of inventing ad-hoc strings. Runtime
 * emitters: `emitLeadCreated` / `emitFeedbackCreated`, lead conversion
 * (`student.enrolled`), and trial-class service (`trial.scheduled` /
 * `trial.completed` / `trial.no_show`).
 */
export const PESKIDS_PRO_EVENT_NAMES = [
  'lead.created',
  'lead.contacted',
  'lead.status_changed',
  'lead.lost',
  'followup.created',
  'followup.completed',
  'followup.overdue',
  'trial.scheduled',
  'trial.completed',
  'trial.no_show',
  'student.enrolled',
] as const;

export type PeskidsProEventName = (typeof PESKIDS_PRO_EVENT_NAMES)[number];

function opslyEventBusUrl(): string | null {
  const raw =
    process.env.OPSLY_EVENT_BUS_URL?.trim() ||
    process.env.NEXT_PUBLIC_OPSLY_EVENT_BUS_URL?.trim() ||
    '';
  if (!raw) {
    return null;
  }
  if (raw.includes('localhost') || raw.includes('127.0.0.1')) {
    if (process.env.NODE_ENV === 'production') {
      console.error('OPSLY_EVENT_BUS_URL must not point to localhost in production');
      return null;
    }
  }
  return raw.endsWith('/events') ? raw : `${raw.replace(/\/$/, '')}/events`;
}
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || 'peskids';

export async function emitEvent(
  eventType: string,
  data: Record<string, unknown>,
  traceId?: string
): Promise<void> {
  const event: OpslyEvent = {
    event_type: eventType,
    tenant_id: TENANT_ID,
    created_at: new Date().toISOString(),
    data,
    trace_id: traceId,
  };

  const busUrl = opslyEventBusUrl();
  if (!busUrl) {
    console.warn(`Skipping event ${eventType}: OPSLY_EVENT_BUS_URL not configured`);
    return;
  }

  try {
    const response = await fetch(busUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Peskids-Event': 'true',
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      console.error(`Failed to emit event ${eventType}:`, response.statusText);
    }
  } catch (error) {
    console.error(`Error emitting event ${eventType}:`, error);
  }
}

export async function emitLeadCreated(
  leadId: string,
  name: string,
  email: string,
  phone: string | null,
  gradeInterested: string,
  referralSource: string | null,
  referralCode?: string | null,
  referredByCode?: string | null,
  referralLink?: string | null
): Promise<void> {
  await emitEvent('lead.created', {
    lead_id: leadId,
    name,
    email,
    phone,
    grade_interested: gradeInterested,
    referral_source: referralSource,
    referral_code: referralCode ?? null,
    referred_by_code: referredByCode ?? null,
    referral_link: referralLink ?? null,
  });
}

export async function emitFeedbackCreated(params: {
  feedbackId: string;
  childName: string;
  satisfaction: number;
  suggestion: string | null;
  parentEmail: string | null;
  authorType?: 'parent' | 'teacher' | 'staff';
  subjectType?: 'general' | 'class' | 'student' | 'operations';
  visibility?: 'public' | 'private';
  audience?: 'family' | 'teacher' | 'admin';
  body?: string | null;
  rating?: number | null;
}): Promise<void> {
  const {
    feedbackId,
    childName,
    satisfaction,
    suggestion,
    parentEmail,
    authorType = 'parent',
    subjectType = 'student',
    visibility = 'public',
    audience = 'family',
    body = suggestion,
    rating = satisfaction,
  } = params;

  await emitEvent('feedback.created', {
    feedback_id: feedbackId,
    child_name: childName,
    satisfaction,
    suggestion,
    parent_email: parentEmail,
    author_type: authorType,
    subject_type: subjectType,
    visibility,
    audience,
    body,
    rating,
  });

  if ((rating ?? satisfaction) < 3) {
    await emitEvent('feedback.alert', {
      feedback_id: feedbackId,
      alert_type: 'low_satisfaction',
      satisfaction: rating ?? satisfaction,
      child_name: childName,
      author_type: authorType,
      subject_type: subjectType,
      visibility,
      audience,
    });
  }
}
