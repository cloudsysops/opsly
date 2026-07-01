export interface SubmissionEventPayload {
  submission_id: string;
  student_name?: string;
  parent_email?: string;
  feedback?: string;
}

export type SubmissionEventType = 'mark_reviewed' | 'send_observations' | 'reassign';

/** Fire-and-forget n8n webhook after a teacher bulk action. Never throws. */
export async function fireSubmissionEvent(
  type: SubmissionEventType,
  submissions: SubmissionEventPayload[],
  triggeredBy?: string
): Promise<{ ok: boolean; detail: string }> {
  const base = process.env.N8N_WEBHOOK_BASE_URL?.replace(/\/$/, '');
  if (!base) {
    console.warn('[n8n-submission-events] N8N_WEBHOOK_BASE_URL not configured — skipping');
    return { ok: false, detail: 'N8N_WEBHOOK_BASE_URL not configured' };
  }

  const url = `${base}/peskids-submission-event`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        tenant_id: process.env.NEXT_PUBLIC_TENANT_ID || 'peskids',
        submissions,
        triggered_at: new Date().toISOString(),
        triggered_by: triggeredBy,
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      const detail = `n8n returned ${res.status}`;
      console.error('[n8n-submission-events]', detail, { type, count: submissions.length });
      return { ok: false, detail };
    }
    return { ok: true, detail: 'event queued in n8n' };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('[n8n-submission-events] fetch failed:', detail, { type });
    return { ok: false, detail };
  }
}
