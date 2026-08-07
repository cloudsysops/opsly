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

# Edge watchdog — recuperación automática (Cloudflare 521)

## Síntoma

- `https://www.peskids.com` / `api.op-sly.com` → Cloudflare **521** (Web server is down)
- En el VPS el contenedor `peskids` puede seguir `healthy`, pero **Traefik** (u `app`/`admin`/`portal`) no está corriendo
- Causa típica en VPS ~4 GiB: OOM / contenedores edge caídos (ver `docs/runbooks/VPS-MEMORY-CAPS.md`)

## Recuperación manual (inmediata)

```bash
ssh vps-dragon@100.120.151.91
cd /opt/opsly/infra
docker compose --env-file /opt/opsly/.env -f docker-compose.platform.yml up -d --no-deps traefik
docker compose --env-file /opt/opsly/.env -f docker-compose.platform.yml up -d --no-deps app admin portal
# si peskids parado:
docker start peskids   # o el compose tenant correspondiente
curl -sfk https://www.peskids.com/api/health
```

## Agente automático (VPS)

Script: `scripts/ops/edge-watchdog.sh`  
Unidades: `infra/systemd/opsly-edge-watchdog.{service,timer}` (cada **2 min**)

Instalar en VPS (una vez, requiere sudo):

```bash
cd /opt/opsly && git pull --ff-only
sudo cp infra/systemd/opsly-edge-watchdog.service infra/systemd/opsly-edge-watchdog.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now opsly-edge-watchdog.timer
systemctl list-timers | grep edge-watchdog
journalctl -u opsly-edge-watchdog.service -n 50 --no-pager
```

**Fallback sin sudo** (crontab del usuario `vps-dragon`, cada 2 min):

```bash
mkdir -p /opt/opsly/runtime/logs
(crontab -l 2>/dev/null | grep -v edge-watchdog.sh; \
 echo '*/2 * * * * OPSLY_ROOT=/opt/opsly NOTIFY=1 /opt/opsly/scripts/ops/edge-watchdog.sh >> /opt/opsly/runtime/logs/edge-watchdog.log 2>&1') | crontab -
```

Preferir el timer systemd cuando haya sudo; no dejar ambos activos a la vez.

Qué hace (sin pull de imágenes, RAM-safe):

1. Si no hay `traefik` o faltan :80/:443 → `compose up -d --no-deps traefik`
2. Si faltan `infra-app-1` / `opsly_admin` / `opsly_portal` → `up app admin portal`
3. Si `peskids` no corre → `docker start peskids`
4. Si Peskids unhealthy → `docker restart peskids`
5. Notifica Discord si `NOTIFY=1`

## Self-Heal vía Orchestrator (opcional)

`POST /api/maia/self-heal` con:

```json
{ "tenant_slug": "platform", "service": "traefik", "action": "restart", "reason": "cf_521" }
```

o `service: "edge"` + `action: "edge-recover"` / `full-restart` para correr el watchdog vía SSH. También `service: "traefik"|"peskids"` + `action: "restart"`. Requiere worker `self-heal` activo (cola `openclaw`).

## Prevención

- Caps de memoria de noche (`docs/runbooks/VPS-MEMORY-CAPS.md`)
- Upgrade VPS 8 GiB cuando Peskids OK comercial
- No deploys pesados de día salvo `hotfix-prod` / `safe-daytime`
