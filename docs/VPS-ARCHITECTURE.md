# VPS Architecture — Dragon's Lair

Documento de referencia para el VPS Ubuntu (usuario `vps-dragon`): un solo edge **Traefik v3** en `:80` / `:443`, con **SmileTrip** (n8n), **Opsly** (API + Admin) y **monitoring** conviviendo en redes Docker aisladas donde aplica.

## Servicios corriendo

| Nombre (típico) | Imagen / stack | Dominio público | Puerto interno | Red Docker |
|-----------------|----------------|-----------------|------------------|------------|
| `traefik` | `traefik:v3.0` (platform) | `https://traefik.${PLATFORM_DOMAIN}` (dashboard, BasicAuth) | 80, 443 (host) | `traefik-public` |
| Réplicas `app` | `${APP_IMAGE}` | `https://api.${PLATFORM_DOMAIN}` | 3000 | `traefik-public`, `internal` |
| `opsly_admin` | `${ADMIN_APP_IMAGE}` | `https://admin.${PLATFORM_DOMAIN}` | 3001 | `traefik-public` |
| `redis` | `redis:7-alpine` | (solo interno) | 6379 | `internal` |
| `smiletrip_n8n` | SmileTrip compose | `https://smiletripcare.com` | 5678 | `default` (SmileTrip) + `traefik-public` |
| `smiletrip_nginx` | (SmileTrip) | **STOP** tras migración | 80/443 (cuando está arriba) | SmileTrip |
| Monitoring (Prometheus/Grafana/…) | `smiletrip/monitoring` | según compose local | según stack | `monitoring_mission` (típico) |
| Tenants n8n (por slug) | generados en `~/opsly/tenants` | `https://n8n-{slug}.cloudsysops.com` | 5678 (típico) | `traefik-public` + red del tenant |

`PLATFORM_DOMAIN` en producción suele ser `opsly.cloudsysops.com` (API → `api.opsly.cloudsysops.com`, Admin → `admin.opsly.cloudsysops.com`, dashboard Traefik → `traefik.opsly.cloudsysops.com`).

## Stacks

| Stack | Ruta en el VPS |
|-------|----------------|
| SmileTrip | `/home/vps-dragon/smiletrip/` (compose principal en `docker/`) |
| Monitoring | `/home/vps-dragon/smiletrip/monitoring/` |
| Opsly | `/home/vps-dragon/opsly/` |
| Copia espejo config Traefik (opcional) | `/home/vps-dragon/traefik/` (sincronizada desde `opsly/infra/traefik/` por el script de migración) |

## Redes Docker

| Red | Alcance |
|-----|---------|
| `traefik-public` | **External** — edge compartido; Traefik, API, Admin, n8n (SmileTrip y tenants) publican routers aquí. |
| `internal` (platform) | Bridge **internal** — Redis y tráfico API↔Redis (sin salida a Internet). |
| Red por defecto de SmileTrip | Tráfico interno del compose SmileTrip (`docker_internal` o nombre del proyecto; según su `docker-compose.yml`). |
| `monitoring_mission` | Red interna del stack de monitoring (nombre según su compose). |
| Redes por tenant | Cada tenant puede usar una red dedicada; el router público sigue en `traefik-public`. |

## Edge routing (Traefik)

| Dominio | Servicio / router | Puerto backend |
|---------|-------------------|----------------|
| `smiletripcare.com` | `smiletrip-n8n` (Docker provider) | 5678 |
| `api.${PLATFORM_DOMAIN}` | API Opsly (`app`) | 3000 |
| `admin.${PLATFORM_DOMAIN}` | Opsly Admin (`opsly_admin`) | 3001 |
| `traefik.${PLATFORM_DOMAIN}` | API interna Traefik + BasicAuth | — |
| `n8n-{slug}.cloudsysops.com` | Routers creados al aprovisionar tenant (labels / file provider) | 5678 (típico) |

## Comandos útiles

```bash
# Logs Traefik (desde el repo Opsly)
cd ~/opsly/infra && docker compose -f docker-compose.platform.yml logs -f traefik

# Estado platform (Traefik + Redis + API + Admin)
docker compose -f ~/opsly/infra/docker-compose.platform.yml ps

# SmileTrip
cd ~/smiletrip/docker && docker compose ps

# Monitoring
cd ~/smiletrip/monitoring && docker compose -f docker-compose.monitoring.yml ps

# Nuevo tenant (requiere .env con TENANTS_PATH, TEMPLATE_PATH, etc.; ver scripts/onboard-tenant.sh)
./scripts/onboard-tenant.sh --slug mi-cliente ...

# Backup orientativo: volúmenes Redis/LetsEncrypt y directorio tenants
docker run --rm -v opsly_redis_data:/data -v "$(pwd):/backup" alpine tar czf /backup/redis_data.tgz -C /data .
# Ajustar nombre del volumen con: docker volume ls | grep redis
```

## Rollback rápido (edge)

Si necesitas volver al nginx de SmileTrip en 80/443:

```bash
docker stop traefik
docker start smiletrip_nginx
```

(Primero Traefik para liberar :80/:443; si no, nginx no podrá enlazar los puertos.)

`smiletrip_nginx` se **detiene** en la migración pero no se elimina (`docker rm`), precisamente para permitir este rollback.

## Migración automatizada

Ver `scripts/migrate-to-traefik.sh` (argumentos `--dry-run`, `--yes`). Genera `docker-compose.traefik.generated.yml` junto al compose de SmileTrip para labels Traefik **sin editar** el `docker-compose.yml` original del proyecto SmileTrip.
