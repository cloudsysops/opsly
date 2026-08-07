---
status: active
owner: operations
last_review: 2026-08-07
type: runbook
tags:
  - opsly/runbook
  - opsly/peskids
  - opsly/edge
---

# Edge watchdog — recuperación **sin humano**

## Qué se recupera solo (sin intervención)

| Fallo | Quién actúa | Acción |
|---|---|---|
| Traefik caído / :80/:443 cerrados | Cron VPS cada 2 min | `compose up traefik` |
| `app` / `admin` / `portal` caídos | Cron VPS | `compose up app admin portal` |
| `peskids` parado / unhealthy | Cron VPS | `docker start` / `restart` |
| Público CF **521** pero local OK | Cron VPS | `docker restart traefik` |
| `n8n_peskids` / `uptime_peskids` | Cron VPS | `docker start` |
| Redis / orchestrator parados | Cron VPS | `docker start` |
| RAM disponible &lt; ~450 Mi | Cron VPS | `docker container prune` (solo exited) |
| Público fallando y cron VPS muerto | Probe externo (Mac) | SSH → mismo watchdog |
| Health fail visto desde n8n | Workflow Eyes + SelfHealWorker | `action: edge-recover` |

**No hace solo (sigue necesitando humano):** resize VPS 8 GiB, deploys/imagen nueva, migraciones, secrets Doppler, `sudo` timer systemd (cron ya cubre).

## Script canónico

`scripts/ops/edge-watchdog.sh` — corre **en el VPS** (flock, cooldown, status JSON).

Instalar / refrescar cron (idempotente, sin sudo):

```bash
./scripts/ops/install-edge-watchdog.sh
```

Unidades: `infra/systemd/opsly-edge-watchdog.{service,timer}` (preferido con sudo).

**Capas automáticas:**
1. Cron VPS cada 2 min (`NOTIFY=1`, Discord solo en recovers reales; low-mem ≤1 alerta/6h)
2. HealthWorker (orchestrator) → `self-heal` / `edge-recover` tras 3 fallos
3. Probe externo Mac (`edge-external-probe.sh` + LaunchAgent cada 3 min)
4. n8n Eyes workflow (opcional)

Probe externo:

```bash
./scripts/ops/edge-external-probe.sh
```

## Recuperación manual (solo si el auto falla)

```bash
ssh vps-dragon@100.120.151.91
cd /opt/opsly && NOTIFY=1 ./scripts/ops/edge-watchdog.sh
curl -sfk https://www.peskids.com/api/health
```

## Instalar timer systemd (opcional, una vez)

```bash
cd /opt/opsly && git pull --ff-only
sudo cp infra/systemd/opsly-edge-watchdog.service infra/systemd/opsly-edge-watchdog.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now opsly-edge-watchdog.timer
# quitar cron duplicado:
crontab -l | grep -v edge-watchdog | crontab -
```

## Self-Heal vía Orchestrator

`POST http://opsly_orchestrator:3011/api/maia/self-heal`

```json
{ "tenant_slug": "peskids", "service": "edge", "action": "edge-recover", "reason": "cf_521" }
```

Workflow n8n: `docs/n8n-workflows/maia/eyes-self-heal.json` (importar en `n8n_peskids` si aún no está).

## Prevención

- Caps de memoria de noche (`docs/runbooks/VPS-MEMORY-CAPS.md`)
- Upgrade VPS 8 GiB cuando Peskids OK comercial
- No deploys pesados de día salvo `hotfix-prod` / `safe-daytime`
