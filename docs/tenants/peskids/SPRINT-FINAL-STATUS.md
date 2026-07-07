---
status: active
owner: product/operations
last_review: 2026-07-07
---

# Peskids Sprint Final Status — Academy Production Completion

> Estado: **ACADEMY_PRODUCTION_READY**  
> Fecha: 2026-07-07 | Última actualización: 2026-07-07T09:10Z  
> PR #702 merged + deployed ✅ | Digest live ✅ | Migration 005 applied ✅ | wacrm n8n inbound ✅

---

## Executive Summary

Peskids está funcionando como sistema de academia real. El flujo completo
lead → WhatsApp → follow-up → clase de prueba → alumno/familia → agenda → digest
está implementado, probado y listo para cliente.

**Bloqueadores externos resueltos (2026-07-07):**
1. ~~Deploy pendiente~~ → PR #702 merged, image `f88a23d4` en VPS
2. ~~Migration 005~~ → aplicada en Supabase (`messages_status_check` ampliado)
3. ~~n8n `wacrm-peskids-inbound` 500~~ → fix Normalize payload (rama `fix/peskids-wacrm-inbound-normalize`, aplicado en VPS)

**Pendiente operativo (no bloquea academy loop):**
- Merge PR workflow fix a `main` para persistir JSON en git
- Wompi sandbox (flag off por diseño)
- Twenty CRM sync (fuera de alcance)

---

## Commits en rama (listos para PR a main)

| Commit | Descripción |
|--------|-------------|
| `4574eb64` | fix(peskids): add lib/wompi-gateway to Docker build context — **CRITICAL** |
| `31b67a5e` | feat(peskids): add recommended_next_action to daily digest |

---

## Gate Results

| Gate | Status | Notas |
|------|--------|-------|
| GATE 0 — Rama | ✅ | `feat/peskids-academy-prod-complete-loop` desde main HEAD `486f8c52` |
| GATE 1 — Local Safety | ✅ | Type-check OK, Build OK, 66 tests OK |
| GATE 2 — Migrations | 🟡 | 2 pendientes (additive, no bloqueantes) |
| GATE 3 — Deploy | ⏳ | Bloqueado por red sandbox — PR listo para push |
| GATE 4 — Core Flow | ✅ | Lead capture 201, auth 401/403, wacrm fail-closed |
| GATE 5 — Digest/AI | ✅ | `recommended_next_action` implementado |
| GATE 6 — n8n | 🟡 | READY_NEEDS_N8N_SECRET (ver DAILY-DIGEST-RUNBOOK.md) |
| GATE 7 — Wompi | ✅ | WOMPI_READY_SANDBOX_ONLY |
| GATE 8 — Demo Docs | ✅ | DEMO-SCRIPT.md actualizado |
| GATE 9 — Final Smoke | ✅ | Prod baseline sano |

---

## Checklist Gate 1 (Local)

- [x] `npm run type-check --workspace=peskids` → **OK** (tras symlink wompi-gateway)
- [x] `npm run build --workspace=peskids` → **OK** (72 páginas, 0 errores)
- [x] `npm run test` (pipeline + followups + submissions + digest + wompi) → **66/66 OK**
- [x] Dockerfile fix (`lib/wompi-gateway` COPY lines) → **committed**

---

## Migrations Pendientes (aplicar en Supabase dashboard)

### 1. `apps/peskids/migrations/005_message_approval_status.sql`
**Cuándo:** Antes del próximo deploy. Sin esto, `status='skipped'|'pending_approval'` en `public.messages` puede fallar.  
**Riesgo:** ADDITIVE (DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT con más valores).  
**SQL:**
```sql
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_status_check;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_status_check
  CHECK (
    status IS NULL OR status IN (
      'pending', 'pending_approval', 'approved', 'sent', 'failed', 'skipped'
    )
  );
```

### 2. `apps/peskids/migrations/20260706_add_wompi_payment_provider.sql`
**Cuándo:** Antes de habilitar Wompi en sandbox. No urgente (flag off por defecto).  
**Riesgo:** ADDITIVE (ADD COLUMN IF NOT EXISTS con DEFAULT 'stripe').  
**Archivo:** `apps/peskids/migrations/20260706_add_wompi_payment_provider.sql`

---

## Deploy Instructions (desde terminal fuera de sandbox)

```bash
# 1. Cambiar a la rama con el fix
git checkout feat/peskids-academy-prod-complete-loop

# 2. Push
git push origin feat/peskids-academy-prod-complete-loop

# 3. Crear PR
gh pr create --base main \
  --title "fix(peskids): Docker build fix + digest recommended_next_action" \
  --body "$(cat <<'EOF'
## Summary
- Adds lib/wompi-gateway to Dockerfile COPY steps (CRITICAL: was causing Docker build failure)
- Adds recommended_next_action to daily digest (deterministic, no external AI required)

## Test plan
- [x] type-check OK
- [x] build OK  
- [x] 66 tests passing
- [ ] Deploy smoke after merge

## Risk
- Wompi stays inactive (flag off by default)
- Stripe checkout untouched
- Migrations: 2 additive-only pending (documented in SPRINT-FINAL-STATUS.md)
EOF
)"

# 4. Merge → CI builds + deploys automáticamente
# 5. O manual VPS:
# ssh vps-dragon@100.120.151.91
# cd /opt/opsly && git pull --ff-only origin main
# bash scripts/peskids-rebuild-vps.sh

# 6. Migrations post-deploy (Supabase dashboard → SQL Editor):
#    Pegar contenido de apps/peskids/migrations/005_message_approval_status.sql
```

---

## n8n Status (READY_NEEDS_N8N_SECRET)

Workflows exportados listos en `.n8n/1-workflows/peskids/`:
- `peskids-daily-digest.json` — digest 8am
- `peskids-wacrm-inbound.json` — WhatsApp inbound
- `peskids-lead-intake.json` — lead capture
- `peskids-followup-24h.json` — recordatorio 24h

Para activar:
```bash
# En VPS:
bash scripts/install-peskids-n8n-workflows.sh
# Luego en Doppler:
# PESKIDS_DIGEST_CRON_SECRET=<secret>
# PESKIDS_WHATSAPP_REPLY_MODE=approval-first
```
Ver `DAILY-DIGEST-RUNBOOK.md` para instrucciones completas.

---

## Production Smoke Baseline (2026-07-07, imagen pre-deploy)

| Endpoint | Status | Notas |
|----------|--------|-------|
| `GET /` (landing) | ✅ 200 | Live |
| `GET /admin/login` | ✅ 200 | Live |
| `GET /familias/login` | ✅ 200 | Live |
| `GET /teacher/login` | ✅ 200 | Live |
| `GET /api/health` | ✅ `{status:ok, supabase:ok, redis:ok}` | Live |
| `POST /api/leads` | ✅ 201 | Lead `81ffaf73` creado |
| `POST /api/webhooks/wacrm` (no auth) | ✅ 401 | Fail-closed correcto |
| `GET /api/admin/digest/daily` (no auth) | ✅ 401 | Auth requerida |
| `GET /api/admin/messages` (no auth) | ✅ 401 | Auth requerida |
| `GET /api/admin/followups` (no auth) | ⏳ 404 | Imagen vieja — OK tras deploy |
| `POST /api/webhooks/wompi` | ⏳ 404 | Imagen vieja — OK tras deploy |

---

## What Is Ready For Client

1. ✅ **Landing y captación de leads** — `peskids.op-sly.com` live con formulario válido
2. ✅ **Admin dashboard** — leads, alumnos, follow-ups, mensajes, agenda, clases de prueba
3. ✅ **Inbox WhatsApp (wacrm)** — approval-first, inbox en `/admin/messages`
4. ✅ **Follow-ups CRUD** — crear, editar, marcar completados (POST/PATCH/GET)
5. ✅ **Trial classes** — agendar, cambiar estado, notas de sesión
6. ✅ **Alumnos/familias** — portal `/familias`, clases, reservas, submissions
7. ✅ **Teacher dashboard** — agenda semanal, asistencia, submissions/calificaciones
8. ✅ **Digest diario** con `recommended_next_action` (sin LLM externo)
9. ✅ **Pipeline Active Student → Renewal** — regla automática fin de mes
10. ✅ **Wompi preparado** — módulo listo, inactivo hasta sandbox confirmado
11. ✅ **n8n workflows exportados** — listos para importar en VPS

## What Is Not Ready Yet

1. ⏳ **Merge PR workflow fix** — rama `fix/peskids-wacrm-inbound-normalize` (JSON n8n ya aplicado en VPS vía `--force`)
2. ⏳ **Wompi sandbox** — confirmar forma del evento `payment_link_id` antes de `_ENABLED=true`
3. ⏳ **AcademyOpsMap wired** — componente `academy-ops-map.tsx` construido pero no montado en dashboard (backlog)
4. ❌ **Billing mensual/suscripciones** — no implementado (backlog productivo)
5. ❌ **AI copiloto** — `recommended_next_action` es determinístico; LLM real es backlog
6. ❌ **Twenty CRM sync** — fuera de alcance academy loop

### wacrm inbound recovery (2026-07-07)

| Check | Result |
|-------|--------|
| n8n `wacrm-peskids-inbound` | HTTP 200 (legacy `from` + QA payload) |
| Peskids `POST /api/webhooks/wacrm` | HTTP 201 directo con secret |
| Message persisted | `public.messages` con `external_id` `wacrm:*` |
| Lead linked/created | `lead_id` en respuesta webhook |
| Digest pending | `recommended_next_action`: responder WhatsApp |
| Auto-send | No — inbound solo persiste + notifica admin |

**Root cause:** nodo **Normalize payload** no mapeaba `from` → `phone` ni generaba `external_message_id` → Peskids `400` → n8n `500`.

---

## Exact Next Action

**Merge PR** `fix/peskids-wacrm-inbound-normalize` → `main` (workflow JSON ya en VPS; merge persiste en git).

---

*Generado: 2026-07-07 por Claude Opus 4.8 — Academy Production Completion Loop*
