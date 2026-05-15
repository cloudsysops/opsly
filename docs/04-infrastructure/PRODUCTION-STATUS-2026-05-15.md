# Opsly Production Status — 2026-05-15

Snapshot operativo tomado desde la máquina de desarrollo con acceso Tailscale al VPS `vps-dragon@100.120.151.91`. Este documento describe el estado observado; no declara que la plataforma esté completamente sana.

## Summary

- **Control plane:** Docker Compose en `/opt/opsly` sobre VPS, con Traefik v3 como edge.
- **Healthy:** portal, orchestrator, Redis, LLM Gateway, Prometheus, Grafana, cAdvisor, Watchtower y tenant stacks n8n/Uptime Kuma.
- **Degraded:** API `app` y Admin.
- **Missing from live snapshot:** `mcp` y `context-builder`, aunque están declarados como parte del control plane/compose.
- **Primary blocker:** API Next.js falla con conflicto de rutas dinámicas `ref` vs `slug`; `/api/health` interno devuelve `500`.

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
| Portal | Healthy | `portal.op-sly.com/login` returned `200`; container healthy | Tenant portal is reachable. |
| Admin | Degraded | `admin.op-sly.com` returned `200`; container `unhealthy` | UI reachable, healthcheck needs correction. |
| API app replicas | Blocked | containers `infra-app-1`, `infra-app-2` unhealthy; internal health `500` | Logs show Next.js dynamic path conflict. |
| Public API route | Degraded | `https://api.op-sly.com/api/health` returned `404` | Traefik/router/domain alignment must be checked. |
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

## Blocking Errors

API logs from `infra-app-1` repeatedly show:

```text
You cannot use different slug names for the same dynamic path ('ref' !== 'slug').
```

Operational interpretation: a Next.js route collision in `apps/api/app/api` is preventing a healthy API boot/health path. The likely conflict is between dynamic routes using `[ref]` and `[slug]` at the same effective route level.

## Next Operational Fixes

1. Correct the Next.js dynamic route conflict in `apps/api/app/api` by standardizing the parameter name or restructuring conflicting routes.
2. Verify the Traefik router for the API points to `api.op-sly.com` and the active `app` service.
3. Recreate the API containers and confirm internal `/api/health` returns `200`.
4. Recheck public `https://api.op-sly.com/api/health`.
5. Fix Admin healthcheck so Docker health matches public reachability.
6. Decide whether `mcp` and `context-builder` should be running in production; either start them or remove them from the current-production docs.

## Architecture Reference

- Canonical runtime architecture: [`../00-architecture/ARCHITECTURE.md`](../00-architecture/ARCHITECTURE.md)
- VPS topology: [`VPS-ARCHITECTURE.md`](VPS-ARCHITECTURE.md)
- Production compose: [`../../infra/docker-compose.platform.yml`](../../infra/docker-compose.platform.yml)
