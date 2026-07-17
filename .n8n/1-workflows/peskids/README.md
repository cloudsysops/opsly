# Peskids — n8n Workflows

All workflows live in this folder and are imported into the n8n instance at
`https://n8n-peskids.op-sly.com`.

---

## Workflow Index

| File | Name | Trigger | Purpose |
|------|------|---------|---------|
| `hot-lead-alert.json` | Peskids - Hot Lead Alert | Every 5 min (schedule) | Polls Supabase for new leads created in last 6 min, sends Discord embed per lead |
| `peskids-lead-capture.json` | Peskids - Lead Capture | POST `/peskids-lead` | Normalises inbound lead payload, inserts to Supabase `leads` table, returns 202 |
| `peskids-lead-intake.json` | Peskids - GHL Lead Intake | POST `/peskids-lead-intake` | Validates Opsly GHL automation envelope, dedupes by `event_id`, returns normalized JSON (no Supabase write) |
| `send-approved.json` | Peskids Send Approved Reply | POST `/peskids-send-approved` | Forwards an approved reply to a parent via WhatsApp (Baileys) |
| `peskids-submission-event.json` | Peskids - Submission Event Dispatcher | POST `/peskids-submission-event` | Routes Phase 7 submission events to Discord / email by event type |
| `peskids-followup-pending.json` | Peskids - Daily Followup Digest | Daily cron `0 8 * * *` | Queries pending followups from Supabase, sends digest to Discord + email |

---

## peskids-lead-intake

**Trigger:** `POST /peskids-lead-intake`

**Caller:** `apps/api/lib/peskids/automation.ts` (`dispatchPeskidsLeadAutomation`) after GHL webhook persistence in Opsly API.

**Base URL (Doppler):** `N8N_WEBHOOK_BASE_URL` → e.g. `https://n8n-peskids.op-sly.com/webhook`

**Payload:** output of `buildPeskidsAutomationPayload()` — `tenant_slug`, `lead_id`, `event_id`, `stage`, `lead`, `automation`, `next_actions`.

**Behaviour:**

- Validates minimum fields (`tenant_slug`, `lead_id`, `event_id`, `lead.*`).
- Dedupes on `event_id` via workflow static data (API already skips duplicate `lead_id` before dispatch).
- Does **not** insert into Supabase (persistence is handled by the GHL webhook route).
- Returns the normalized payload as the response body so the caller can confirm acceptance without waiting on any downstream side effect.

**Install / smoke:**

```bash
./scripts/install-peskids-n8n-workflows.sh --force
./scripts/smoke-peskids-n8n-lead-intake.sh
```

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
  ?tenant_id=eq.peskids
  &status=eq.pending
  &select=id,type,due_date,notes,contact_id,contact_type
  &order=due_date.asc
```

**IF node (`Has Pending Followups?`):**
- Use `{{ $input.all().length }} > 0` (item count). Do **not** use `Array.isArray($json)` — HTTP Request splits rows into items.

**Digest logic (Code node):**
- Start with `const list = $input.all().map((i) => i.json);`
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

---

## peskids-followup-24h

**Trigger:** Schedule — every 1 hour

**Node flow:**
```
Every 1 Hour → Execute Follow-ups (POST Peskids /api/admin/followups/execute)
             → Check Result (ok === true)
               true  → Has Follow-ups? (executed.length > 0)
                         true  → Discord Notification
                         false → No Follow-ups
               false → No Follow-ups
```

**Auth:** `Authorization: Bearer` with `PESKIDS_FOLLOWUP_CRON_SECRET` (fallback `PESKIDS_DIGEST_CRON_SECRET`).

**Does not call GoHighLevel.** Execution lives in Peskids app (`executeDueFollowups`) and syncs Twenty task status to DONE when a followup is completed.

**Env vars required (n8n):**
- `PESKIDS_APP_URL`
- `PESKIDS_FOLLOWUP_CRON_SECRET` (or digest fallback)
- `OPSLY_CRM_NOTIFY_WEBHOOK_URL`

