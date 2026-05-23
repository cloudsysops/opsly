# VPS Architecture — Dragon's Lair

Documento de referencia para el VPS Ubuntu (`vps-dragon@100.120.151.91`, Tailscale). El control plane de Opsly corre en `/opt/opsly` con Docker Compose y un único edge **Traefik v3** en `:80` / `:443`.

## Verified Production Status (2026-05-15)

Este estado fue verificado por SSH/Tailscale y checks HTTP. Refleja lo que está vivo hoy, incluyendo degradaciones.

| Servicio / contenedor | Estado observado | Dominio / endpoint | Nota operativa |
| --- | --- | --- | --- |
| `traefik` | Running | `:80`, `:443`, dashboard local `127.0.0.1:8080` | Edge activo. |
| `opsly_portal` | Healthy | `https://portal.op-sly.com/login` | Responde `200`. |
| `opsly_admin` | Degraded | `https://admin.op-sly.com` | Público `200`, contenedor `unhealthy`. |
| `infra-app-1`, `infra-app-2` | Blocked / unhealthy | `https://api.op-sly.com/api/health` | Público `404`; health interno `500`. Logs: conflicto Next.js `ref` vs `slug`. |
| `opsly_orchestrator` | Healthy | interno `http://127.0.0.1:3011/health` | Responde `{"status":"ok","service":"orchestrator","role":"full","mode":"full-stack"}`. |
| `opsly_llm_gateway` | Running / health ok | interno `http://127.0.0.1:3010/health` | Responde `{"status":"ok","service":"llm-gateway"}`. |
| `infra-redis-1` | Healthy | Tailscale bind `100.120.151.91:6379` | Redis/BullMQ vivo. |
| `opsly_prometheus` | Healthy | local `127.0.0.1:9090` | Métricas activas. |
| `opsly_grafana` | Healthy | dominio Traefik configurado | Observabilidad activa. |
| `opsly_cadvisor` | Healthy | internal | Métricas de contenedores. |
| `opsly_watchtower` | Healthy | internal | Auto-update de imágenes etiquetadas. |
| `mcp` | Missing in live `docker ps` | declarado en compose | Decidir si levantarlo o retirarlo del estado de prod. |
| `context-builder` | Missing in live `docker ps` | declarado en compose | Decidir si levantarlo o retirarlo del estado de prod. |

## Tenant stacks observed

Todos estos stacks mostraron n8n y Uptime Kuma corriendo healthy en el VPS:

| Tenant | Contenedores observados |
| --- | --- |
| `smiletripcare` | `n8n_smiletripcare`, `uptime_smiletripcare` |
| `peskids` | `n8n_peskids`, `uptime_peskids` |
| `localrank` | `n8n_localrank`, `uptime_localrank` |
| `legalvial` | `n8n_legalvial`, `uptime_legalvial` |
| `jkboterolabs` | `n8n_jkboterolabs`, `uptime_jkboterolabs` |
| `intcloudsysops` | `n8n_intcloudsysops`, `uptime_intcloudsysops` |

## Stacks

| Stack | Ruta en el VPS |
| --- | --- |
| Opsly platform | `/opt/opsly` |
| Platform compose | `/opt/opsly/infra/docker-compose.platform.yml` |
| Tenant runtime | `/opt/opsly/runtime/tenants/` / runtime mounts según `.env` |
| Traefik dynamic config | `/opt/opsly/infra/traefik` |

## Redes Docker

| Red | Alcance |
| --- | --- |
| `traefik-public` | **External** — edge compartido; Traefik, portal, admin, API y tenants publican routers aquí. |
| `infra_internal` | Bridge interno del compose plataforma; Redis, orchestrator, observabilidad y servicios internos. |
| `infra_redis_edge` | Red edge para Redis/exporters y acceso Tailscale controlado. |
| Redes por tenant | Cada tenant puede usar red dedicada; el router público sigue en `traefik-public`. |

## Edge routing (Traefik)

| Dominio | Servicio / router | Puerto backend | Estado |
| --- | --- | --- | --- |
| `portal.op-sly.com` | `opsly_portal` | 3002 | Healthy |
| `admin.op-sly.com` | `opsly_admin` | 3001 | Público `200`, Docker `unhealthy` |
| `api.op-sly.com` | `app` | 3000 | Degradado; `404` público en `/api/health`, `500` interno |
| `traefik.${PLATFORM_DOMAIN}` | dashboard Traefik + BasicAuth | api@internal | Activo si router coincide con `.env` |
| Tenant n8n/uptime hosts | routers por stack tenant | 5678 / 3001 | Healthy para tenants observados |

## Current blockers

1. **API degraded:** corregir conflicto Next.js de rutas dinámicas en `apps/api/app/api`; no mezclar `[ref]` y `[slug]` cuando Next lo interpreta como el mismo path dinámico.
2. **API routing:** verificar que el router Traefik del servicio `app` apunte consistentemente a `api.op-sly.com`.
3. **API health:** recrear `app` y validar `/api/health` interno antes de declarar producción sana.
4. **Admin healthcheck:** revisar por qué `admin.op-sly.com` responde `200` pero Docker marca `opsly_admin` como `unhealthy`.
5. **MCP / Context Builder:** levantar o retirar del compose según la decisión real de producción.

## Comandos útiles

```bash
# Logs Traefik (desde el repo Opsly en VPS)
cd /opt/opsly/infra && docker compose --env-file /opt/opsly/.env -f docker-compose.platform.yml logs -f traefik

# Estado platform
cd /opt/opsly && docker compose --env-file /opt/opsly/.env -f infra/docker-compose.platform.yml ps

# Health interno orchestrator
docker exec opsly_orchestrator node -e "fetch('http://127.0.0.1:3011/health').then(async r=>{console.log(r.status); console.log(await r.text())})"

# Health interno LLM Gateway
docker exec opsly_llm_gateway sh -lc "curl -sf http://127.0.0.1:3010/health"

# Health API público esperado tras corregir bloqueo
curl -sS -m 15 -w '\nHTTP_STATUS=%{http_code}\n' https://api.op-sly.com/api/health

# Backup orientativo: volúmenes Redis/LetsEncrypt y directorio tenants
docker run --rm -v opsly_redis_data:/data -v "$(pwd):/backup" alpine tar czf /backup/redis_data.tgz -C /data .
# Ajustar nombre del volumen con: docker volume ls | grep redis
```
