---
status: active
owner: operations
alert_id: vps-memory-2026-07
updated: 2026-07-29
---

# ACTIVE CAPACITY ALERT

## STATUS: active

**Severidad:** warning
**Título:** Capacidad del servidor al límite

### Resumen

El VPS compartido (~4 GiB) está bajo presión de memoria. Caps por servicio listos; upgrade a **8 GiB / 4 vCPU (~$48/mes)** pendiente de cuota mensual con Peskids.

### Qué debe hacer el agente (Cursor)

1. **Avisar al usuario en el chat** al inicio de sesión si este archivo dice `STATUS: active`.
2. No proponer merge/deploy pesado de día ni `--execute` de caps fuera de ventana nocturna.
3. No resize DigitalOcean sin OK humano / comercial.
4. Enlazar runbooks:
   - `docs/runbooks/VPS-MEMORY-CAPS.md`
   - `docs/runbooks/CAPACITY-ALERT-NOTIFICATIONS.md`
5. Fuente de copy: `lib/capacity-alert/alert.json`

### Acciones humanas pendientes

1. Aplicar caps de noche: `./scripts/ops/apply-vps-memory-caps.sh --execute`
2. Notificar: `doppler run … ./scripts/ops/notify-capacity-alert.sh --send --to <email>`
3. Alinear cuota mensual con Peskids
4. Tras upgrade: poner `active: false` en `lib/capacity-alert/alert.json` y cambiar este archivo a `STATUS: resolved`

### Cómo desactivar

1. `lib/capacity-alert/alert.json` → `"active": false`
2. Este archivo → `STATUS: resolved` (y `status: resolved` en frontmatter)
3. Commit en PR de ops (no force a main)
