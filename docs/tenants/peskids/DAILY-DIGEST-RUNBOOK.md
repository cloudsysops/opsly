---
status: draft
owner: operations
last_review: 2026-06-09
type: tenant
tags:
  - opsly/tenant
  - peskids/phase2
---

# Peskids — Resumen diario (digest 8am)

Operación del **resumen diario** para owner/staff y automatización con n8n.

## Endpoint

| Método | Ruta | Auth |
|--------|------|------|
| GET | `/api/admin/digest/daily` | Staff admin **o** cron secret |

### Staff (dashboard / manual)

Sesión admin Supabase o `DASHBOARD_ADMIN_SECRET` (cookie/header).

```bash
curl -sS "https://peskids.op-sly.com/api/admin/digest/daily" \
  -H "Cookie: admin-token=$DASHBOARD_ADMIN_SECRET"
```

### n8n (8:00 AM America/Bogota)

Programar workflow con HTTP Request:

- **URL:** `https://peskids.op-sly.com/api/admin/digest/daily`
- **Method:** GET
- **Header:** `Authorization: Bearer {{$env.PESKIDS_DIGEST_CRON_SECRET}}`
  - Alternativa: `x-cron-secret: {{$env.PESKIDS_DIGEST_CRON_SECRET}}`
  - Fallback ops: `CRON_SECRET` si no hay variable dedicada

### Respuesta (JSON)

Campos principales para n8n:

- `leads.new_today`, `leads.pending`, `leads.new_today_items[]`
- `followups.due_today`, `followups.pending_total`
- `messages.pending_approval`, `messages.pending_items[]`
- `trial_classes.scheduled_today`
- `highlight_lines[]` — texto listo para email/WhatsApp interno

## Variables Doppler / VPS

| Variable | Uso |
|----------|-----|
| `PESKIDS_DIGEST_CRON_SECRET` | Token n8n → digest (recomendado) |
| `CRON_SECRET` | Fallback compartido plataforma |
| `PESKIDS_WHATSAPP_REPLY_MODE` | `approval-first` o `draft` (sin auto-envío) |
| `N8N_WEBHOOK_BASE_URL` | Base webhooks n8n tenant |

## Mensajes — approval-first

1. Mensaje entrante → estado `pending_approval`
2. Staff **Aprueba** (guarda borrador, no envía)
3. **Copiar mensaje** → WhatsApp manual
4. **Marcar enviado** → cierra sin webhook
5. **Aprobar y enviar** → encola n8n (`peskids-send-approved`) solo con acción explícita

## Migración DB

Aplicar en Supabase si aún no está:

`apps/peskids/migrations/005_message_approval_status.sql`

Estados: `pending_approval`, `approved`, `sent`, `failed`, `skipped`.

## Smoke post-deploy

```bash
curl -sf "https://peskids.op-sly.com/api/health"
curl -sf "https://peskids.op-sly.com/api/admin/digest/daily" \
  -H "Authorization: Bearer $PESKIDS_DIGEST_CRON_SECRET" | jq '.leads,.messages,.highlight_lines'
curl -sfI "https://n8n-peskids.op-sly.com/"
```
