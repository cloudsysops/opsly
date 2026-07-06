---
status: draft
owner: operations
last_review: 2026-07-06
type: tenant
tags:
  - opsly/tenant
  - peskids/sprint-02
---

# Peskids Sprint 02 — Phase 2 Week 2 Status

**Focus:** Mensajería approval-first + resumen diario 8am  
**Branch:** `feat/peskids-phase2-week2-messaging-digest`  
**Sprint 01:** ✅ Live (PR #678)  
**Open Source CRM Gate 1:** ✅ **RECOVERED** 2026-07-06 — lead capture 201 en prod (ver `OPEN-SOURCE-CRM-MIGRATION.md` § Gate 1)

## Implemented (Week 2)

| Area | Status | Notes |
|------|--------|-------|
| Approval-first API | ✅ | `approve`, `send`, `mark_sent`, `skip` en `POST /api/messages/[id]/reply` |
| Default WhatsApp mode | ✅ | `draft` / approval-first si env vacío |
| Admin inbox UX | ✅ | Aprobar, Copiar, Marcar enviado, Aprobar y enviar, Omitir |
| Daily digest API | ✅ | `GET /api/admin/digest/daily` (staff + cron) |
| Digest service | ✅ | leads, follow-ups, mensajes pendientes, clases de prueba |
| Migration 005 | 📋 | `005_message_approval_status.sql` — tenant `public.messages`; no bloquea leads; verificar/aplicar |
| Platform migrations 0075/0082/0084 | ✅ | GHL + Twenty columns en `platform.peskids_leads` (0084 repair drift 2026-07-06) |
| n8n workflow 8am | ⏳ | Runbook: `DAILY-DIGEST-RUNBOOK.md` |

## Security

- Staff/admin required for inbox actions (`validateStaffSession`)
- Digest: staff **or** `PESKIDS_DIGEST_CRON_SECRET` / `CRON_SECRET`
- Tenant fixed `peskids` on digest route
- No WhatsApp auto-send without explicit `action: send`

## Validation checklist

- [ ] `npm run type-check --workspace=peskids`
- [ ] `npm run test --workspace=peskids`
- [ ] `npm run build --workspace=peskids`
- [ ] PR CI green
- [ ] Deploy Peskids
- [x] Smoke prod lead capture (`POST /api/leads` → 201) — 2026-07-06
- [x] Platform migrations 0081–0084 aplicadas en Supabase prod — 2026-07-06
- [ ] Smoke prod (admin mensajes, digest cron, n8n)
- [ ] Migración 005 en Supabase (`public.messages`)

## Demo additions

Ver `DEMO-SCRIPT.md` sección **Week 2 — Mensajes y resumen diario**.

## Blockers

| Blocker | Mitigation |
|---------|------------|
| Migration 005 not applied | Run `apps/peskids/migrations/005_message_approval_status.sql` in Supabase; until then `skipped`/`pending_approval` writes may fail |
| ~~Lead capture 500 (missing `ghl_contact_id`)~~ | ✅ Resuelto 2026-07-06 — `0084` repair + `0082` Twenty columns |
| n8n digest schedule | Import HTTP node per runbook |
| Jelou/WhatsApp live send | Only via explicit approve+send; manual copy path always available |

## Next action

1. Commit `supabase/migrations/0084_repair_peskids_ghl_tracking_fields.sql` to `main` (repo alineado con prod)  
2. Apply / verify migration 005 on `public.messages`  
3. Set `PESKIDS_DIGEST_CRON_SECRET` in Doppler + n8n cron 8am  
4. Confirm `PESKIDS_WHATSAPP_REPLY_MODE=approval-first` in prod
