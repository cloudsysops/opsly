---
status: active
owner: peskids
last_review: 2026-06-09
---

# Peskids — wacrm WhatsApp Inbox Runbook

wacrm is the **official open-source WhatsApp inbox** for Peskids. Peskids Admin remains the operational panel; Supabase/Opsly is the source of truth; n8n handles alerts and digest glue.

## Architecture

```
WhatsApp → wacrm sidecar → n8n (optional) → POST /api/webhooks/wacrm → Supabase → Peskids Admin
```

**No auto-send:** inbound events only persist messages and link leads. Outbound WhatsApp requires human approval in admin (approval-first).

## Environment variables (Doppler `ops-intcloudsysops/prd`)

| Variable | Purpose |
|----------|---------|
| `PESKIDS_INBOX_PROVIDER` | Set to `wacrm` after smoke PASS (`legacy` when unset) |
| `WACRM_PESKIDS_ENABLED` | `true` only when sidecar runtime is healthy |
| `WACRM_PESKIDS_SERVER_URL` | e.g. `https://wa-peskids.op-sly.com` |
| `NEXT_PUBLIC_WACRM_PESKIDS_SERVER_URL` | Same URL for admin deep links |
| `WACRM_PESKIDS_WEBHOOK_SECRET` | Shared secret for webhook auth |
| `PESKIDS_WACRM_WEBHOOK_SECRET` | Optional alias accepted by API |
| `WACRM_PESKIDS_SYNC_TWENTY` | `none` \| `notes-only` \| `person-link` (future) |

## Webhook

**URL:** `https://peskids.op-sly.com/api/webhooks/wacrm`

**Headers (one of):**

- `x-wacrm-webhook-secret: <secret>`
- `x-webhook-secret: <secret>`
- `Authorization: Bearer <secret>`

### Example payload — `inbound_message`

```json
{
  "tenant_slug": "peskids",
  "provider": "wacrm",
  "event_type": "inbound_message",
  "external_conversation_id": "conv-abc",
  "external_message_id": "msg-123",
  "phone": "+573001112233",
  "contact_name": "María",
  "body": "Hola, quiero información",
  "direction": "inbound",
  "timestamp": "2026-06-09T15:00:00.000Z",
  "metadata": {}
}
```

**Idempotency:** `external_message_id` is stored as `wacrm:<id>`. Duplicates return `200` with `duplicate: true`.

## Production activation (2026-07-06)

| Step | Status |
|------|--------|
| PR [#684](https://github.com/cloudsysops/opsly/pull/684) merged | ✅ `60e2cc38` |
| Dockerfile fix PR [#686](https://github.com/cloudsysops/opsly/pull/686) | ✅ `a77ea815` |
| Deploy Peskids (`deploy-peskids.yml` run `28801490746`) | ✅ |
| Pre-flag webhook smoke (`POST /api/webhooks/wacrm`) | ✅ 401 sin secret · 201 con secret · idempotencia OK |
| Doppler `PESKIDS_INBOX_PROVIDER=wacrm` | ✅ en contenedor `peskids` |
| Doppler `WACRM_PESKIDS_SERVER_URL` + `NEXT_PUBLIC_*` | ✅ |
| Doppler `WACRM_PESKIDS_WEBHOOK_SECRET` | ✅ (no loguear) |
| `WACRM_PESKIDS_ENABLED` | ⏸ `false` hasta sidecar `https://wa-peskids.op-sly.com` healthy |
| n8n workflow `peskids-wacrm-inbound` | ⚠️ importado; publicar/activar + `WACRM_PESKIDS_WEBHOOK_SECRET` en env n8n |
| Admin inbox UI (browser) | ⏳ pendiente sesión staff |
| Digest API prod | ⏳ falta `PESKIDS_DIGEST_CRON_SECRET` o `CRON_SECRET` en Doppler |

**Import n8n (VPS):** el JSON debe incluir `"id": "peskids-wacrm-inbound"`. Tras import, usar publish offline (ver `scripts/install-peskids-n8n-workflows.sh`).


```bash
export WACRM_SECRET="$(doppler secrets get WACRM_PESKIDS_WEBHOOK_SECRET --plain --project ops-intcloudsysops --config prd)"
curl -sfS -X POST "https://peskids.op-sly.com/api/webhooks/wacrm" \
  -H "Content-Type: application/json" \
  -H "x-wacrm-webhook-secret: ${WACRM_SECRET}" \
  -d '{
    "tenant_slug": "peskids",
    "provider": "wacrm",
    "event_type": "inbound_message",
    "external_message_id": "smoke-'"$(date +%s)"'",
    "phone": "+573001112233",
    "contact_name": "Smoke Test",
    "body": "smoke wacrm inbound",
    "direction": "inbound"
  }'
```

Verify:

1. HTTP `201` or `200` (duplicate)
2. Row in `public.messages` with `external_id` prefix `wacrm:`
3. Lead created or linked in `platform.peskids_leads`
4. Visible in Peskids Admin inbox / interesados card
5. Daily digest includes wacrm pending line
6. **No** automatic WhatsApp reply sent

## n8n

Import minimal workflow: `docs/examples/n8n/wacrm-inbound-peskids.json`

Flow: wacrm event → HTTP POST to `/api/webhooks/wacrm` with secret header.

## Troubleshooting

| Symptom | Check |
|---------|--------|
| `401 Unauthorized` | `WACRM_PESKIDS_WEBHOOK_SECRET` in Doppler + correct header |
| `403 Tenant mismatch` | `tenant_slug` must be `peskids` |
| Message missing in admin | `public.messages` RLS + tenant_id |
| Lead not linked | Phone format; check `platform.peskids_leads.phone` |
| No wacrm badge | `external_id` must start with `wacrm:` |

## Rollback

1. Set `PESKIDS_INBOX_PROVIDER` unset or `legacy`
2. Set `WACRM_PESKIDS_ENABLED=false`
3. Point wacrm/n8n webhooks back to `/api/webhooks/inbound` if needed
4. Redeploy Peskids app image

## Twenty CRM (later)

Commercial pipeline sync to Twenty remains a **separate gate** (`crm-peskids.op-sly.com`). This runbook does not enable Twenty.

## Related

- `docs/tenants/peskids/WACRM-CHANNEL.md`
- `docs/tenants/peskids/OPEN-SOURCE-CRM-MIGRATION.md`
- `scripts/tenants/wacrm-smoke.sh`
