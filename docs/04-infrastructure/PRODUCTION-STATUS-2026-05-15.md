# Opsly Production Status — 2026-05-15

Snapshot operativo tomado desde la máquina de desarrollo con acceso Tailscale al VPS `vps-dragon@100.120.151.91`. Este documento describe el estado observado; no declara que la plataforma esté completamente sana.

## Summary

- **Control plane:** Docker Compose en `/opt/opsly` sobre VPS, con Traefik v3 como edge.
- **Healthy after recovery:** portal, API `app`, Admin, orchestrator, Redis, LLM Gateway, Prometheus, Grafana, cAdvisor, Watchtower y tenant stacks n8n/Uptime Kuma.
- **Missing from live snapshot:** `mcp` y `context-builder`, aunque están declarados como parte del control plane/compose.
- **Primary blocker resolved on VPS branch `codex/merge-vps-local-runtime-2026-05-15`:** API Next.js ya no falla con conflicto de rutas dinámicas `ref` vs `slug`; `/api/health` devuelve `200`.

## Recovery Update — 2026-05-15 15:18 UTC

Se guardó el estado sucio del VPS en stash antes de cambiar de rama:
`pre-codex-automation-crm-deploy-20260515T143940Z`.

El VPS quedó en la rama `codex/merge-vps-local-runtime-2026-05-15` (`53b23536`).
Se construyó localmente la imagen `ghcr.io/cloudsysops/intcloudsysops-api:latest`,
se recrearon `app`, `admin`, `portal` y `traefik`, y luego se construyó/recreó
`ghcr.io/cloudsysops/intcloudsysops-portal:latest` para publicar la oferta
Automation CRM.

Checks externos posteriores:

| URL | Estado |
| --- | --- |
| `https://portal.op-sly.com/login` | `200 text/html` |
| `https://op-sly.com/automation-crm` | `200 text/html` |
| `https://portal.op-sly.com/automation-crm` | `200 text/html` |
| `https://api.op-sly.com/api/health` | `200 application/json` |
| `https://admin.op-sly.com` | `307` hacia `/dashboard`, luego `200` |

`docker compose ps` posterior mostró `app`, `admin`, `portal`, `orchestrator`,
`redis`, `prometheus`, `grafana`, `cadvisor` y `watchtower` healthy. Disco raíz:
`48G` total, `34G` usado, `15G` libre (`70%`).

## Commands Used

```bash
curl -sS -m 15 -w '\nHTTP_STATUS=%{http_code}\n' https://api.op-sly.com/api/health
curl -sS -m 15 -I https://admin.op-sly.com
curl -sS -m 15 -I https://portal.op-sly.com/login

ssh -o BatchMode=yes -o ConnectTimeout=8 vps-dragon@100.120.151.91 \
  'cd /opt/opsly && docker compose --env-file /opt/opsly/.env -f infra/docker-compose.platform.yml ps --format json'

ssh -o BatchMode=yes -o ConnectTimeout=8 vps-dragon@100.120.151.91 \
  'docker exec opsly_orchestrator node -e "fetch(\"http://127.0.0.1:3011/health\").then(async r=>{console.log(r.status); console.log(await r.text())})"'

ssh -o BatchMode=yes -o ConnectTimeout=8 vps-dragon@100.120.151.91 \
  'docker exec opsly_llm_gateway sh -lc "curl -sf http://127.0.0.1:3010/health"'
```

## Service Status

| Service | Observed status | Evidence | Notes |
| --- | --- | --- | --- |
| Traefik | Running | `docker ps`: `traefik` up | Public edge on `80/443`. |
| Portal | Healthy | `portal.op-sly.com/login` returned `200`; container healthy | Tenant portal is reachable; `/automation-crm` public offer live. |
| Admin | Healthy | `admin.op-sly.com` redirects to `/dashboard` and returns `200`; container healthy | Public reachability restored. |
| API app replicas | Healthy | containers `infra-app-1`, `infra-app-2` healthy; internal health `200` | Dynamic route conflict resolved by branch deploy. |
| Public API route | Healthy | `https://api.op-sly.com/api/health` returned `200` | Supabase and Redis checks ok. |
| Orchestrator | Healthy | internal health `200` | Reports `role=full`, `mode=full-stack`. |
| LLM Gateway | Healthy | internal health JSON `{"status":"ok","service":"llm-gateway"}` | Running as `opsly_llm_gateway`. |
| Redis | Healthy | `infra-redis-1` healthy | Bound on Tailscale for worker access. |
| Prometheus | Healthy | `opsly_prometheus` healthy | Local `127.0.0.1:9090`. |
| Grafana | Healthy | `opsly_grafana` healthy | Traefik labels configured. |
| cAdvisor | Healthy | `opsly_cadvisor` healthy | Container metrics. |
| Watchtower | Healthy | `opsly_watchtower` healthy | Auto-updates labeled services. |
| MCP | Missing | not present in `docker ps` snapshot | Declared in architecture/compose; not observed live. |
| Context Builder | Missing | not present in `docker ps` snapshot | Declared in architecture/compose; not observed live. |

## Tenant Runtime Status

Observed healthy tenant containers:

| Tenant | n8n | Uptime Kuma |
| --- | --- | --- |
| `smiletripcare` | `n8n_smiletripcare` healthy | `uptime_smiletripcare` healthy |
| `peskids` | `n8n_peskids` healthy | `uptime_peskids` healthy |
| `localrank` | `n8n_localrank` healthy | `uptime_localrank` healthy |
| `legalvial` | `n8n_legalvial` healthy | `uptime_legalvial` healthy |
| `jkboterolabs` | `n8n_jkboterolabs` healthy | `uptime_jkboterolabs` healthy |
| `intcloudsysops` | `n8n_intcloudsysops` healthy | `uptime_intcloudsysops` healthy |

## Previous Blocking Errors

API logs from `infra-app-1` repeatedly show:

```text
You cannot use different slug names for the same dynamic path ('ref' !== 'slug').
```

Operational interpretation: a Next.js route collision in `apps/api/app/api` prevented a healthy API boot/health path. The deployed recovery branch preserves `apps/api/app/api/metrics/tenant/[slug]/route.ts` and removes the bad `[ref]` rename for that route.

## Next Operational Fixes

1. Decide whether `mcp` and `context-builder` should be running in production; either start them or remove them from the current-production docs.
2. Move local image builds to CI/GHCR so the VPS does not need to compile large Next.js images under load.
3. Create a sales demo tenant dedicated to Automation CRM and document its n8n/Uptime URLs.
4. Review missing optional provider env vars (`DEEPSEEK_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `XAI_API_KEY`) or stop referencing them in compose when intentionally disabled.

## Architecture Reference

- Canonical runtime architecture: [`../00-architecture/ARCHITECTURE.md`](../00-architecture/ARCHITECTURE.md)
- VPS topology: [`VPS-ARCHITECTURE.md`](VPS-ARCHITECTURE.md)
- Production compose: [`../../infra/docker-compose.platform.yml`](../../infra/docker-compose.platform.yml)
