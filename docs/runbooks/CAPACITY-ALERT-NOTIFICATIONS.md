---
status: canon
owner: operations
last_review: 2026-07-29
---

# Capacity alert — notificaciones (Peskids + Opsly + email + Cursor)

## Objetivo

Avisar de forma clara cuando el VPS está al límite de memoria, sin alarmismo innecesario y sin romper Peskids live.

## Fuente única

| Artefacto | Rol |
|-----------|-----|
| `lib/capacity-alert/alert.json` | Copy + `active` + canales |
| `@intcloudsysops/capacity-alert` | Import TS para UI |
| `docs/ops/ACTIVE-CAPACITY-ALERT.md` | Estado para agentes Cursor |
| `.cursor/rules/capacity-alert.mdc` | Regla alwaysApply |

## Canales

### 1. Peskids admin

Banner ámbar bajo el header (`CapacityAlertBanner` en `AdminShell`).  
Dismiss local (sessionStorage); no cancela email/Discord.

### 2. Opsly admin

Banner en `AppChrome` (control plane). Mismo `alert.id` para dismiss.

### 3. Email + Discord

```bash
# Dry-run
./scripts/ops/notify-capacity-alert.sh --dry-run --to "tu@email.com"

# Envío real (Doppler)
doppler run --project ops-intcloudsysops --config prd -- \
  ./scripts/ops/notify-capacity-alert.sh --send --to "tu@email.com"
```

Opcional en Doppler: `CAPACITY_ALERT_TO` (lista coma-separada) para no pasar `--to` cada vez.

Requiere `RESEND_API_KEY` + `RESEND_FROM_EMAIL` (o `RESEND_FROM_ADDRESS`) y `DISCORD_WEBHOOK_URL` para Discord.

### 4. Agente Cursor

Si `docs/ops/ACTIVE-CAPACITY-ALERT.md` tiene `STATUS: active`, el agente debe mencionarlo al inicio de sesión (regla `capacity-alert.mdc`).

## Activar / resolver

**Activar:** `alert.json` → `"active": true` + `ACTIVE-CAPACITY-ALERT.md` → `STATUS: active`.

**Resolver (tras upgrade DO + estabilizar):**

1. `"active": false` en `alert.json`
2. `STATUS: resolved` en `ACTIVE-CAPACITY-ALERT.md`
3. PR; banners desaparecen en el siguiente deploy

## Relacionado

- Caps técnicos: `docs/runbooks/VPS-MEMORY-CAPS.md`
- Ventana prod: `docs/runbooks/PRODUCTION-CHANGE-WINDOW.md`
