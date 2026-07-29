# @intcloudsysops/capacity-alert

Fuente única del aviso de capacidad VPS (banners Peskids/Opsly, email, Discord, Cursor).

## Activar / desactivar

Editar `alert.json`:

- `"active": true` → banners + scripts de notify tratan la alerta como vigente
- `"active": false` → UI oculta; `notify-capacity-alert.sh` sale sin enviar (salvo `--force`)

## Canales

| Canal | Cómo |
|-------|------|
| Peskids admin | Banner en `AdminShell` |
| Opsly admin | Banner en `AppChrome` |
| Email + Discord | `./scripts/ops/notify-capacity-alert.sh` |
| Cursor | `docs/ops/ACTIVE-CAPACITY-ALERT.md` + regla `.cursor/rules/capacity-alert.mdc` |

Runbook: `docs/runbooks/CAPACITY-ALERT-NOTIFICATIONS.md`
