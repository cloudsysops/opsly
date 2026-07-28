---
status: canon
owner: operations
last_review: 2026-07-28
---

# Nightly Ops Upgrade + Rollback

Automatización nocturna (01:00 `America/Bogota`) para upgrades seguros en el VPS sin romper la operación del día siguiente.

## Qué hace (`scripts/nightly-ops-upgrade.sh`)

1. **Git sync** — `git pull --ff-only origin main` en `/opt/opsly`
2. **Merge de PRs** — solo PRs abiertos con label **`night-merge`** y mergeables (CI verde)
3. **n8n upgrade** — a `N8N_TARGET_VERSION` (default **2.32.5**) tenant por tenant, con **rollback automático** si falla health
4. **Housekeeping ligero** — prune de imágenes/cache Docker
5. **Smoke** — API health, `www.peskids.com`, n8n peskids, contenedores críticos
6. **Discord** — éxito o fallo

Si el smoke falla → exit 1 + alerta Discord. Cada tenant n8n fallido queda en la versión anterior (rollback).

## Ventana

- Solo corre entre **22:00–06:00 America/Bogota** (salvo `NIGHTLY_FORCE=1`).
- Alineado a [`PRODUCTION-CHANGE-WINDOW.md`](PRODUCTION-CHANGE-WINDOW.md).

## Install (VPS, user `vps-dragon`)

```bash
cd /opt/opsly
git pull --ff-only origin main
./scripts/install-nightly-ops-cron.sh
crontab -l | grep NIGHTLY
```

Dry-run:

```bash
NIGHTLY_FORCE=1 ./scripts/nightly-ops-upgrade.sh --dry-run
```

Upgrade n8n un tenant ahora (con rollback):

```bash
./scripts/upgrade-n8n-tenant.sh --slug intcloudsysops --target 2.32.5
./scripts/upgrade-n8n-tenant.sh --slug peskids --target 2.32.5
```

## Cómo encolar un merge nocturno

1. Abrir PR a `main` con cambios listos.
2. Añadir label GitHub: **`night-merge`**.
3. Dejar CI verde.
4. A la 01:00 el cron hace squash-merge + pull en VPS + upgrades/smoke.

## Rollback manual

```bash
# Si un contenedor quedó mal y el auto-rollback no corrió:
docker ps -a --filter name=n8n_peskids
# Buscar n8n_<slug>_bak_*
docker stop n8n_peskids
docker rename n8n_peskids n8n_peskids_bad
docker rename n8n_peskids_bak_YYYYMMDDHHMMSS n8n_peskids
docker start n8n_peskids
curl -sf https://n8n-peskids.op-sly.com/healthz
```

## Pendiente humano (sudo)

El cron **no** puede hacer `apt upgrade` / reboot sin passwordless sudo. Tras nightly:

```bash
cat /opt/opsly/runtime/logs/nightly-ops/pending-human-actions.txt
# En ventana nocturna:
sudo apt update && sudo apt upgrade -y
# Si reboot-required:
sudo reboot
```

## Logs

- `/opt/opsly/runtime/logs/nightly-ops.cron.log`
- `/opt/opsly/runtime/logs/nightly-ops.YYYYMMDD.log`
- State: `/opt/opsly/runtime/logs/nightly-ops/`

## Pin de imagen n8n

Canonical: `config/opsly.config.json` → `services.n8n.image` = `n8nio/n8n:2.32.5`  
Template: `infra/templates/docker-compose.tenant.yml.tpl`
