---
status: active
owner: operations
last_review: 2026-07-23
type: tenant
tags:
  - opsly/tenant
  - peskids/pro-1.0
---

# Peskids Pro 1.0 — Runbook operativo

> Cierre del programa ([`PESKIDS-PRO-1.0-IMPLEMENTATION-PLAN.md`](./PESKIDS-PRO-1.0-IMPLEMENTATION-PLAN.md)).
> WhatsApp sigue siendo manual vía `wa.me`. Sin Meta Cloud API / WACRM runtime / GHL.

## 1. Superficies admin (post PRO-0…11)

| Ruta / ancla | Capacidad |
| --- | --- |
| `/admin` | Dashboard ejecutivo, KPIs, interesados, digest context |
| `/admin#team` | Equipo (invites / roles) |
| `/admin#classes` | Clases y calendario operativo |
| `/admin#trial-classes` | Agenda de clases de prueba (filtros fecha/profesor/estado) |
| `/admin/interesados/[id]` | Ficha 360 + matricular + trials + seguimientos |
| `/admin/pipeline` | Kanban comercial |
| `/admin/messages` | Inbox (existente) |
| `/admin/settings` | Settings tenant |

## 2. Feature flags (Doppler `prd` — default OFF)

| Flag | Efecto |
| --- | --- |
| `PESKIDS_HOT_LEAD_ALERTS_ENABLED` | Hot-lead alert no bloqueante |
| `PESKIDS_DAILY_DIGEST_ENABLED` | Digest diario |
| `PESKIDS_OPERATIONAL_NOTIFICATIONS_ENABLED` | Canal operativo (Discord/etc.) |
| `PESKIDS_LEAD_REMINDER_24H_ENABLED` | Aging 24h |
| `PESKIDS_LEAD_ESCALATION_48H_ENABLED` | Aging 48h |
| `PESKIDS_AUTO_CREATE_FOLLOWUP_ENABLED` | Auto-followup (si cableado) |
| `PESKIDS_TRIAL_REMINDER_ENABLED` | Reminder trials (si cableado) |
| `PESKIDS_LEAD_CONFIRMATION_ENABLED` | Email confirmación lead (API; default off) |
| `PESKIDS_FAMILY_ACCESS_EMAIL_ENABLED` | Email magic-link portal familias (default **off**) |
| `PESKIDS_CONTACT_SLA_HOURS` | SLA horas (default `48`) |
| `PESKIDS_RENEWAL_REMINDER_ENABLED` | Auto-followup + Twenty Task al entrar a etapa Renewal (post Pro 1.0) |
| `OPSLY_EVENT_BUS_URL` | Bus de eventos; si falta → warning, no bloquea writes |

Helpers: `apps/peskids/lib/peskids-pro-flags.ts`.

**Activación:** solo con aprobación humana. Flags off = comportamiento fail-closed.

### Soft-launch (equipo Peskids primero)

1. **Fase interna:** staff usa `/admin` para captar leads nuevos, matricular y cargar alumnos ya activos. **No** se envían correos a familias (`PESKIDS_FAMILY_ACCESS_EMAIL_ENABLED=false` + `PESKIDS_LEAD_CONFIRMATION_ENABLED=false`).
2. **Prueba:** validar pipeline, ficha 360, trials, equipo/clases con datos reales.
3. **Go-live familias:** cuando el equipo Peskids autorice explícitamente → activar `PESKIDS_FAMILY_ACCESS_EMAIL_ENABLED=true` en Doppler y redeploy/restart si hace falta.

Invitaciones de **staff** (`/admin#team`) son independientes y siguen disponibles para el equipo operativo.

## 3. Eventos de dominio emitidos

Catálogo: `PESKIDS_PRO_EVENT_NAMES` en `apps/peskids/lib/events.ts`. Detalle: [`EVENT-CONTRACT.md`](./EVENT-CONTRACT.md).

| Evento | Emisor principal |
| --- | --- |
| `lead.created` | Captura pública / API `public-lead-post` (+ `emitLeadCreated` helper) |
| `lead.status_changed` | `updateLeadForAdmin` |
| `lead.contacted` | `updateLeadForAdmin` → status `contacted` |
| `lead.lost` | `updateLeadForAdmin` → status `archived` |
| `followup.created` | `createFollowup` |
| `followup.completed` | `updateFollowup` → `completed` |
| `followup.overdue` | Aging scan (`processOverdueFollowups`) |
| `feedback.created` / `feedback.alert` | Feedback público |
| `trial.scheduled` | `createTrialClass` |
| `trial.completed` | `updateTrialClass` → status `attended` |
| `trial.no_show` | `updateTrialClass` → status `no_show` |
| `student.enrolled` | `convertLeadToStudent` |
| `lead.renewal_due` | `PipelineManagerService.notifyRenewalDue` (post Pro 1.0) — lead entra a etapa Renewal |

Sin bus configurado el write path a Supabase **no** falla.

## 4. Smoke post-deploy (no secrets)

```bash
# Health (siempre 200 si el proceso responde)
curl -sf "https://peskids.op-sly.com/api/health" | jq .

# Admin login + UI (humano):
# 1) /admin/login
# 2) /admin — KPIs + TrialClassesPanel
# 3) /admin/pipeline — Kanban
# 4) Abrir un interesado → Matricular / trial status
```

Health enriquecido (PRO-12): `{ status, version, service, observability }` con booleans de flags/bus **sin** valores de secretos.

## 5. Rollback

1. **Flags off** en Doppler → redeploy/restart app si hace falta.
2. **Revert** del squash PR en `main` si el código es el problema.
3. Migraciones del programa son aditivas (`IF NOT EXISTS` / columnas nuevas) — revert de código no exige drop.
4. Purga demo (solo entornos de prueba): `scripts/purge-peskids-demo-data.sh --dry-run` primero.

## 6. Decisiones diferidas (explícitas)

- **`audit_log` genérico tenant-aware:** diferido. El programa cierra sin migración nueva de audit; eventos + sync columns (`twenty_sync_*`, followup `sync_*`) cubren observabilidad mínima.
- **Meta / WACRM / GHL:** fuera de alcance (fase posterior).
- **Activación de flags en prod:** requiere humano + smoke.

## 7. Checklist de cierre Pro 1.0

- [x] PR-PRO-0 … PR-PRO-11 mergeados en `main`
- [x] Runbook + EVENT-CONTRACT alineados a emitters reales
- [x] Health expone señal de observabilidad (flags/bus) sin secretos
- [ ] Humano: activar flags uno a uno en Doppler tras smoke
- [ ] Humano: confirmar Twenty vivo en VPS antes de depender del stage-sync en operación diaria
