---
status: canon
owner: product
last_review: 2026-09-07
type: tenant
tags:
  - opsly/tenant
  - opsly/peskids
---

# Peskids — secure enrollment flow

Stacked on the AI Board enrollment journey (PR #1129). This slice implements the first real golden path without production auto-send.

## Route

`/matricula/<opaque-token>`

Authorization lives in the token record, never in `?lead_id=`, `?student_id=` or `?family_id=`.

## Token

Stored on `platform.peskids_leads.metadata.enrollment_access`:

- `token_hash` (SHA-256 of the raw token)
- `purpose = enrollment`
- `tenant_slug = peskids`
- `expires_at` (7 days)
- `revoked_at` / `used_at` / `opened_at` / `created_at`
- `policy = single_use_on_submit`

Opening the link records `opened_at` without consuming the token. Successful submit sets `used_at`. Retry after success returns the same enrollment outcome.

## Family / student

No Supabase family auth user is created. Family is a hashed `family_ref` plus guardian snapshot on the student (`parent_email`, `parent_phone`). Student reuse is keyed by `source_lead_id`. Business enrollment is the lead → `enrolled` + `enrollment_outcome` metadata. `class_enrollments` stays for logged-in families later.

## WhatsApp

`ENROLLMENT_LINK` draft is prepared for staff. `execute_external=false`. Staff presses SEND / OPEN WHATSAPP. Opening WhatsApp is `whatsapp.opened`, never `whatsapp.sent`.

## Hot-lead flag

This slice does **not** change Doppler. Inventory (boolean only, 2026-09-07):

| Flag | `prd` | `stg` |
| --- | --- | --- |
| `PESKIDS_HOT_LEAD_ALERTS_ENABLED` | **true** (already set; not changed here) | missing / default false |
| `PESKIDS_WHATSAPP_AUTO_SEND_ENABLED` | missing / default false | missing |
| Other Peskids automation flags listed in code | false | missing |

`prd` already has the hot-lead **internal** flag on. The n8n workflow file in repo is still `active: false`. Do not treat that as a customer auto-send. Do not flip production flags in this PR. Staging Doppler does not yet isolate the flag.

Staging proof (synthetic only):

1. Create a synthetic lead.
2. Confirm `lead.created` persists even if n8n/orchestrator are down.
3. Set the flag only in the staging Doppler config.
4. Confirm n8n `peskids-hot-lead-alert` posts an **internal** alert with stable `delivery_id = hot-lead:<lead_id>`.
5. Confirm no customer WhatsApp/SMS/email is sent.
6. Rollback: `PESKIDS_HOT_LEAD_ALERTS_ENABLED=false`.

## Staging probe (2026-09-07)

Synthetic HEAD only. No customer data written.

| URL | Result |
| --- | --- |
| `https://peskids-staging.op-sly.com/` | 200 |
| `https://peskids-staging.op-sly.com/matricula/<opaque>` | 404 — route not deployed yet |
| `https://www.peskids.com/matricula/<opaque>` | 404 — expected; this PR is not in production |

Live golden-flow E2E stays blocked until a **night** staging deploy of #1130. Do not daytime-deploy Peskids.

## Production

This slice does **not** authorize production flag activation, production deploy, or a new applied migration.

## Enlaces relacionados

- [[tenants/peskids/CANONICAL-CUSTOMER-JOURNEY|Canonical customer journey]]
- [[tenants/peskids/AI-BOARD-INTEGRATION|AI Board integration]]
