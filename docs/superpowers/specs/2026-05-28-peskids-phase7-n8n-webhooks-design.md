# Phase 7 — Peskids n8n Webhook Automation

**Date:** 2026-05-28  
**Status:** Approved  
**Scope:** Fire n8n events after teacher bulk actions on form submissions

## Context

Phase 6 connected the teacher dashboard to real Supabase data via `FormSubmissionService`. Phase 7 closes the automation loop: when a teacher marks submissions reviewed, sends observations, or reassigns — n8n is notified so it can trigger downstream workflows (parent WhatsApp/email notifications, teacher alerts).

## Architecture

### New file: `apps/peskids/lib/n8n-submission-events.ts`

Follows the existing `n8n-send.ts` pattern:
- Reads `N8N_WEBHOOK_BASE_URL` env var
- POSTs to `/peskids-submission-event`
- Fire-and-forget (non-blocking, 12s timeout)
- Returns `{ ok, detail }` — errors are logged, never surfaced to client

**Payload:**
```ts
{
  type: 'mark_reviewed' | 'send_observations' | 'reassign',
  tenant_id: string,          // 'peskids'
  submissions: Array<{
    submission_id: string,
    student_name?: string,
    parent_email?: string,
    feedback?: string,
  }>,
  triggered_at: string,       // ISO timestamp
  triggered_by?: string,      // staff user id
}
```

### Modified file: `apps/peskids/app/api/submissions/bulk-grade/route.ts`

After `successJson(...)`, fire `void fireSubmissionEvent(...)` (non-blocking).  
Passes `action`, array of updated submission IDs + metadata, and `auth.user?.id`.

## Data Flow

```
Teacher clicks bulk action
  → POST /api/submissions/bulk-grade
    → validateStaffRequest
    → Supabase UPDATE form_submissions
    → successJson (client response sent)
    → void fireSubmissionEvent() [non-blocking]
      → POST N8N_WEBHOOK_BASE_URL/peskids-submission-event
        → n8n workflow: notify parents / teachers
```

## Error Handling

- `N8N_WEBHOOK_BASE_URL` not set → log warning, return `{ ok: false }`, no throw
- n8n returns non-2xx → log error, no impact on API response
- n8n timeout (12s) → log error, no impact on API response

## What n8n does (per action)

| action | n8n workflow |
|--------|-------------|
| `mark_reviewed` | Notify parent: entrega revisada |
| `send_observations` | Send observations text via WhatsApp/email |
| `reassign` | Notify relevant teacher of reassignment |

## Testing

- Unit: mock `fetch`, verify payload shape and URL for each action
- Integration: `N8N_WEBHOOK_BASE_URL` not set → graceful no-op
- Manual: trigger bulk action in teacher dashboard, verify n8n receives webhook
