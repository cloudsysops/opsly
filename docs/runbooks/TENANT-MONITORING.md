---
status: canon
owner: operations
last_review: 2026-07-27
---

# Tenant monitoring (Opsly) — Peskids first

Smoke de URLs públicas + (en VPS) contenedores Docker y recursos host (disco/RAM/swap). Alertas Discord vía `scripts/notify-discord.sh`.

## Config

- `config/tenant-monitoring.json` — targets por `tenant_slug` (empezar por `peskids`).
- Umbrales por defecto: disco 80/90%, RAM disponible 512/256 Mi, swap 80%.

### Peskids — dominio canónico

| Prioridad | URL | Qué valida |
|-----------|-----|------------|
| 1 (canónico) | `https://www.peskids.com` | landing, `/api/health`, admin, familias |
| 1 | `https://peskids.com` | apex landing + health (200 o redirect a www) |
| 2 (legacy) | `https://peskids.op-sly.com` | redirect o 200 (transición) |
| tools | `n8n-peskids.op-sly.com`, `uptime-peskids.op-sly.com` | CRM / Uptime Kuma |

Detalle DNS/Traefik: `docs/tenants/peskids/CUSTOM-DOMAIN-WWW.md`.

## Ejecución manual

```bash
# Solo URLs públicas (desde laptop o CI)
./scripts/monitor-tenants.sh --slug peskids --no-discord

# En VPS: URLs + contenedores + disco/RAM
cd /opt/opsly
./scripts/monitor-tenants.sh --local-host --slug peskids
```

Heartbeat OK opcional: `MONITOR_HEARTBEAT=1 ./scripts/monitor-tenants.sh …`

## Instalar timers (VPS)

### Opción A — systemd (requiere sudo)

```bash
cd /opt/opsly && git pull --ff-only
sudo ./scripts/install-tenant-monitor-timer.sh
# dry-run:
sudo ./scripts/install-tenant-monitor-timer.sh --dry-run
```

| Unit | Cadencia | Qué hace |
|------|----------|----------|
| `opsly-tenant-monitor.timer` | 5 min | `monitor-tenants.sh --local-host` |
| `opsly-host-resource-alert.timer` | 10 min | `disk-alert.sh` |

### Opción B — crontab del usuario (sin sudo)

```bash
cd /opt/opsly
./scripts/install-tenant-monitor-cron.sh
```

Logs: `/opt/opsly/runtime/logs/tenant-monitor.log` (y `tenant-monitor.cron.log` si usas cron).

Por defecto el monitor es **quiet** (solo start/done + WARN/FAIL). `MONITOR_VERBOSE=1` o `--verbose` imprime cada OK.
WARN Discord se deduplica (`MONITOR_WARN_COOLDOWN_SEC`, default 6h) para no ocultar FAILs nuevos.
Baseline limpia: `./scripts/reset-ops-logs.sh` (archiva y trunca). Logrotate: `infra/cron/logrotate-opsly-tenant-monitor.conf`.

## Requisitos

- `jq`, `curl`, `python3` en el host.
- Discord: `DISCORD_WEBHOOK_URL` en `/opt/opsly/.env` (Doppler bootstrap).
- Contenedores Peskids esperados: `peskids`, `n8n_peskids`, `uptime_peskids`.

## Añadir otro tenant

1. Entrada en `config/tenant-monitoring.json` (`slug`, `containers`, `urls`).
2. Commit + deploy a `/opt/opsly`.
3. Sin reiniciar timer: el próximo tick lee el JSON.

## Relacionado

- `docs/runbooks/PRODUCTION-CHANGE-WINDOW.md` — merges/deploys de noche.
- `scripts/disk-alert.sh` — umbrales disco + housekeeping emergencia.
- Uptime Kuma por tenant (UI) complementa este smoke de control plane.
