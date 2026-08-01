---
status: canon
owner: operations
last_review: 2026-07-28
---

# Peskids WhatsApp Meta — sandbox runbook

## Architecture

- **Primary:** Meta Cloud API (`lib/whatsapp-channel` + `/api/webhooks/meta/whatsapp`)
- **Optional:** WACRM adapter (existing `/api/webhooks/wacrm`) — OFF by default
- **SoT:** Supabase `messages` + outbox `platform.whatsapp_outbound_outbox` (migration 0093 — apply only with human approval)
- **Approvals:** `/admin/messages` composer (approve → outbox; send → Meta dispatch) + panel `/admin/integrations/whatsapp` (`GET/POST /api/admin/whatsapp/outbox`)
- **Rule:** never mark `sent` when Meta outbound is skipped/disabled; n8n sync only after Meta success

## Flags (all default OFF)

```
PESKIDS_WHATSAPP_ENABLED=false
PESKIDS_WHATSAPP_INBOUND_META=false
PESKIDS_WHATSAPP_OUTBOUND_ENABLED=false
WACRM_PESKIDS_ENABLED=false
PESKIDS_GHL_ENABLED=false
```

## Event bus (`/events`)

Peskids `emitEvent` posts to `OPSLY_EVENT_BUS_URL` (appends `/events` if missing).

**Canonical:** Orchestrator `POST /events` (alias `POST /internal/events`), Bearer `PLATFORM_ADMIN_TOKEN` or `OPSLY_EVENT_BUS_TOKEN`.

```
# Doppler / compose (internal network only)
OPSLY_EVENT_BUS_URL=http://opsly_orchestrator:3011
OPSLY_EVENT_BUS_TOKEN=<same-or-dedicated-token>
```

Without URL → warning only (writes still succeed). Without token → 401 from orchestrator.

## Infra notes (sandbox, no prod activate)

- Traefik: Meta webhook is on the Peskids host (`/api/webhooks/meta/whatsapp`); no public Traefik route to orchestrator `/events`.
- Compose: Peskids + orchestrator + llm-gateway on shared `traefik-public` / `internal` per platform compose; set `OPSLY_EVENT_BUS_URL` to the orchestrator container DNS.
- LLM Gateway: draft generation only; outbound WhatsApp never bypasses approval outbox.
- Migration `0093_peskids_whatsapp_outbound_outbox.sql`: **do not apply** without human approval.
- Smoke: `./scripts/peskids/whatsapp-meta-sandbox-smoke.sh --base-url http://127.0.0.1:3004`
- GHL guard: `npm run guard:ghl-runtime` / `npm run guard:ghl-runtime:test`

## Doppler (manual, no values in repo)

| Secret | Uso |
|--------|-----|
| `META_WHATSAPP_VERIFY_TOKEN` | GET challenge |
| `META_WHATSAPP_APP_SECRET` | `X-Hub-Signature-256` |
| `META_WHATSAPP_ACCESS_TOKEN` | Graph send (solo tras approval + flag outbound) |
| `META_WHATSAPP_PHONE_NUMBER_ID` | Graph path |
| `META_WHATSAPP_WABA_ID` | Inventario |
| `META_API_VERSION` | default `v21.0` |

## Rollback

1. Set all WhatsApp flags to `false` in Doppler / `.env`
2. Redeploy or restart Peskids container
3. Confirm `/api/health/whatsapp` → `inbound_accepting: false`
4. GHL remains disabled (`PESKIDS_GHL_ENABLED=false` → 410 on webhook)

## Go / no-go (humano)

No activar `enabled` hasta: firma OK, persistencia OK, approval OK, send sandbox OK, delivery status OK.
