import { OpslyEvent } from './types'

const OPSLY_EVENT_BUS_URL = process.env.OPSLY_EVENT_BUS_URL || process.env.NEXT_PUBLIC_OPSLY_EVENT_BUS_URL || 'http://localhost:3011/events'
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || 'peskids'

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
  }

  try {
    const response = await fetch(OPSLY_EVENT_BUS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Peskids-Event': 'true',
      },
      body: JSON.stringify(event),
    })

    if (!response.ok) {
      console.error(`Failed to emit event ${eventType}:`, response.statusText)
    }
  } catch (error) {
    console.error(`Error emitting event ${eventType}:`, error)
  }
}

export async function emitLeadCreated(
  leadId: string,
  name: string,
  email: string,
  phone: string | null,
  gradeInterested: string,
  referralSource: string | null
): Promise<void> {
  await emitEvent('lead.created', {
    lead_id: leadId,
    name,
    email,
    phone,
    grade_interested: gradeInterested,
    referral_source: referralSource,
  })
}

export async function emitFeedbackCreated(
  feedbackId: string,
  childName: string,
  satisfaction: number,
  suggestion: string | null,
  parentEmail: string | null
): Promise<void> {
  await emitEvent('feedback.created', {
    feedback_id: feedbackId,
    child_name: childName,
    satisfaction,
    suggestion,
    parent_email: parentEmail,
  })

  if (satisfaction < 3) {
    await emitEvent('feedback.alert', {
      feedback_id: feedbackId,
      alert_type: 'low_satisfaction',
      satisfaction,
      child_name: childName,
    })
  }
}
