# Peskids — n8n Workflows

All workflows live in this folder and are imported into the n8n instance at
`https://n8n-peskids.op-sly.com`.

---

## Workflow Index

| File | Name | Trigger | Purpose |
|------|------|---------|---------|
| `hot-lead-alert.json` | Peskids - Hot Lead Alert | Every 5 min (schedule) | Polls Supabase for new leads created in last 6 min, sends Discord embed per lead |
| `peskids-lead-capture.json` | Peskids - Lead Capture | POST `/peskids-lead` | Normalises inbound lead payload, inserts to Supabase `leads` table, returns 202 |
| `send-approved.json` | Peskids Send Approved Reply | POST `/peskids-send-approved` | Forwards an approved reply to a parent via WhatsApp (Baileys) |
| `peskids-submission-event.json` | Peskids - Submission Event Dispatcher | POST `/peskids-submission-event` | Routes Phase 7 submission events to Discord / email by event type |
| `peskids-followup-pending.json` | Peskids - Daily Followup Digest | Daily cron `0 8 * * *` | Queries pending followups from Supabase, sends digest to Discord + email |

---

## peskids-submission-event

**Trigger:** `POST /peskids-submission-event`

**Caller:** `apps/peskids/lib/n8n-submission-events.ts`

**Payload schema:**
```json
{
  "type": "mark_reviewed" | "send_observations" | "reassign",
  "tenant_id": "peskids",
  "submissions": [{ "submission_id": "uuid", "feedback": "text or null" }],
  "triggered_at": "ISO timestamp",
  "triggered_by": "user-id or null"
}
```

**Node flow:**
```
Webhook → Accepted (202) + Parse Payload → Route By Type (Switch)
  mark_reviewed  → Format Reviewed Discord   → Discord Reviewed
  send_observations → Format Observations Discord → Discord Observations
                                              → Email Observations (Resend)
  reassign       → Format Reassign Discord   → Discord Reassigned
```

**Env vars required:**
- `OPSLY_CRM_NOTIFY_WEBHOOK_URL` — Discord webhook for all notification nodes
- `PESKIDS_OWNER_EMAIL` — email recipient for `send_observations` emails
- `RESEND_API_KEY` — Resend API key for email delivery

**Notes:**
- The webhook responds 202 immediately (fan-out via n8n's multi-output connection on the webhook node) so the caller is never blocked waiting for notifications.
- All notification nodes have `continueOnFail: true` — a Discord outage will not prevent the email from sending and vice versa.
- `send_observations` triggers both Discord and email in parallel.

---

## peskids-followup-pending

**Trigger:** Schedule — cron `0 8 * * *` (08:00 daily, server timezone)

**Node flow:**
```
Schedule → Query Pending Followups (Supabase GET)
         → Has Pending Followups? (IF)
           true  → Format Followup Digest (Code) → Discord Followup Digest
                                                 → Email Followup Digest (Resend)
           false → No Followups - Stop (no-op)
```

**Supabase query:**
```
GET /rest/v1/followups
  ?tenant_slug=eq.peskids
  &status=eq.pending
  &select=id,type,due_date,notes,contact_id,contact_type
  &order=due_date.asc
```

**Digest logic (Code node):**
- Splits followups into three buckets: Vencidos (overdue), Hoy (due today), Próximos (future)
- Discord embed colour is red when there are overdue items, blue otherwise
- Digest text is capped at 3 900 chars in the Discord embed to stay within API limits

**Env vars required:**
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — service role key for authenticated REST queries
- `OPSLY_CRM_NOTIFY_WEBHOOK_URL` — Discord webhook
- `PESKIDS_OWNER_EMAIL` — email recipient
- `RESEND_API_KEY` — Resend API key

**Notes:**
- Both notification nodes have `continueOnFail: true`.
- If the table does not yet exist, the HTTP Request node will return an error (caught by `continueOnFail`) and the IF node will receive an empty/error body — the workflow will take the `false` branch and stop silently.
