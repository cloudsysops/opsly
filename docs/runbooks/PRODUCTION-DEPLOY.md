---
status: draft
owner: operations
last_review: 2026-05-28
type: runbook
tags:
  - opsly/runbook
---

# Runbook de Despliegue a Producción

> **Propósito:** Guía paso a paso para desplegar Opsly Core (API, Admin, Portal, Orchestrator, LLM Gateway, MCP) en el VPS de producción.
>
> **Responsable:** Operations / DevOps
> **Duración estimada:** 30–45 minutos
> **Frecuencia:** Por release o hotfix

---

## Arquitectura objetivo

```
GitHub Actions (build + push GHCR)
        │
        ▼
VPS (157.245.223.7 / Tailscale 100.120.151.91)
  ├── Traefik (TLS, routing)
  ├── Redis (BullMQ, cache)
  ├── API (app, puerto 3000)
  ├── Admin (puerto 3001)
  ├── Portal (puerto 3002)
  ├── Orchestrator (puerto 3011)
  ├── LLM Gateway (puerto 3010)
  └── Stacks por tenant (n8n, Uptime Kuma)
```

---

## 1. Pre-Deploy Checklist

Ejecutar en la máquina local **antes** de cualquier deploy.

### 1.1 Verificar entorno local

```bash
# 1. Type-check completo
npm run type-check

# 2. Tests unitarios
npm run test

# 3. Lint
npm run lint

# 4. Validar OpenAPI spec
npm run validate-openapi

# 5. Validar skills manifest
npm run validate-skills

# 6. Ejecutar verification de readiness
./scripts/verify-production-readiness.sh
```

Si `verify-production-readiness.sh` da score < 90, **detener el deploy** y corregir.

### 1.2 Verificar git

```bash
# Working tree debe estar limpio
git status

# Revisar últimos commits
git log --oneline -10

# Asegurar que main está actualizada
git fetch origin main
git log --oneline HEAD..origin/main
# Si hay commits detrás: git pull --ff-only origin main
```

### 1.3 Secretos y variables

```bash
# Verificar que Doppler prd tiene todas las variables requeridas
doppler run --project ops-intcloudsysops --config prd -- env | grep -E \
  "^(PLATFORM_DOMAIN|SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY|STRIPE_SECRET_KEY|RESEND_API_KEY|REDIS_URL|CRON_SECRET|OPSLY_ORCHESTRATOR_MODE)="
```

Variables requeridas en Doppler `prd`:

| Variable                    | Ejemplo                         | Notas                                    |
|-----------------------------|---------------------------------|------------------------------------------|
| `PLATFORM_DOMAIN`           | `op-sly.com`                    | Dominio base para subdominios            |
| `SUPABASE_URL`              | `https://jkwykp...supabase.co`  | URL del proyecto Supabase                |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...`                        | Service role key (sensible)              |
| `STRIPE_SECRET_KEY`         | `sk_live_...`                   | Stripe secret key (sensible)             |
| `RESEND_API_KEY`            | `re_...`                        | Resend API key (sensible)                |
| `REDIS_URL`                 | `redis://...:6379`              | Redis connection string                  |
| `CRON_SECRET`               | `<uuid>`                        | Secreto para endpoints cron              |
| `OPSLY_ORCHESTRATOR_MODE`   | `queue-only`                    | `queue-only` en VPS, `worker-enabled` en workers |

### 1.4 Verificar VPS accesible

```bash
# SSH por Tailscale
ssh vps-dragon@100.120.151.91 "echo OK && hostname"

# Verificar disco
ssh vps-dragon@100.120.151.91 "df -h /"

# Verificar Docker
ssh vps-dragon@100.120.151.91 "docker info --format '{{.ServerVersion}}'"

# Verificar contenedores actuales
ssh vps-dragon@100.120.151.91 "docker ps --format 'table {{.Names}}\t{{.Status}}'"
```

**Requisitos mínimos:**
- SSH responde ✅
- Disco libre > 10 GB (si no, ejecutar `./scripts/vps-docker-housekeeping.sh`)
- Docker daemon responde ✅
- Contenedores actuales no están en estado `restarting`

---

## 2. Build Process

El build se hace desde GitHub Actions automáticamente al pushear a `main`.

### 2.1 Build automático (recomendado)

```bash
# Pushear a main para activar CI/CD
git push origin main
```

Esto dispara `.github/workflows/deploy.yml` que:
1. Corre `type-check` + `lint`
2. Buildea imágenes Docker multi-stage
3. Publica a GHCR:
   - `ghcr.io/cloudsysops/intcloudsysops-api:latest`
   - `ghcr.io/cloudsysops/intcloudsysops-admin:latest`
   - `ghcr.io/cloudsysops/intcloudsysops-portal:latest`
   - `ghcr.io/cloudsysops/intcloudsysops-orchestrator:latest`
   - `ghcr.io/cloudsysops/intcloudsysops-llm-gateway:latest`
   - `ghcr.io/cloudsysops/intcloudsysops-mcp:latest`
4. Taggea con `${{ github.sha }}` para rollback

Monitorear en: https://github.com/cloudsysops/opsly/actions

### 2.2 Build manual (emergencia)

```bash
# Si Actions no está disponible, build y push manual
docker login ghcr.io -u <user> --password-stdin < <pat>

docker build -f apps/api/Dockerfile -t ghcr.io/cloudsysops/intcloudsysops-api:latest .
docker push ghcr.io/cloudsysops/intcloudsysops-api:latest

# Repetir para admin, portal, orchestrator, llm-gateway, mcp
```

---

## 3. VPS Deploy Sequence

### 3.1 Deploy automático (desde CI/CD)

Si el workflow `deploy.yml` tiene job `deploy` configurado con SSH, se ejecuta automáticamente post-build:

```bash
# El workflow ejecuta en el VPS:
cd /opt/opsly

# Sincronizar repo
git fetch origin main
git reset --hard origin/main

# Sincronizar .env desde Doppler
doppler secrets download --project ops-intcloudsysops --config prd > .env

# Pull imágenes nuevas
docker compose --env-file /opt/opsly/.env -f infra/docker-compose.platform.yml pull

# Recrear servicios
docker compose --env-file /opt/opsly/.env -f infra/docker-compose.platform.yml up -d --no-deps app admin portal orchestrator llm-gateway mcp
```

### 3.2 Deploy manual (por SSH)

Si el CI/CD no está disponible o se necesita deploy manual:

```bash
# 1. SSH al VPS
ssh vps-dragon@100.120.151.91

# 2. Ir al repo
cd /opt/opsly

# 3. Sincronizar código
git fetch origin main
git reset --hard origin/main

# 4. Actualizar .env desde Doppler
doppler secrets download --project ops-intcloudsysops --config prd > .env

# 5. Docker login GHCR
echo "$GHCR_PAT" | docker login ghcr.io -u "$GHCR_USER" --password-stdin

# 6. Pull imágenes nuevas
docker compose --env-file /opt/opsly/.env -f infra/docker-compose.platform.yml pull

# 7. Recrear servicios específicos (sin bajar los demás)
docker compose --env-file /opt/opsly/.env -f infra/docker-compose.platform.yml up -d --no-deps app admin portal

# 8. Si se cambiaron imágenes de orchestrator/llm-gateway/mcp
docker compose --env-file /opt/opsly/.env -f infra/docker-compose.platform.yml up -d --no-deps orchestrator llm-gateway mcp

# 9. Si Traefik cambió (raro)
docker compose --env-file /opt/opsly/.env -f infra/docker-compose.platform.yml up -d --force-recreate traefik
```

### 3.3 Full stack restart (solo si es necesario)

```bash
# Bajar todo
docker compose --env-file /opt/opsly/.env -f infra/docker-compose.platform.yml down

# Levantar todo
docker compose --env-file /opt/opsly/.env -f infra/docker-compose.platform.yml up -d
```

> ⚠️ **Advertencia:** Esto causa downtime de ~60 segundos. Usar solo cuando sea estrictamente necesario.

---

## 4. Post-Deploy Verification

Después del deploy, verificar cada servicio.

### 4.1 Health endpoints

```bash
# Local (desde el VPS)
ssh vps-dragon@100.120.151.91 "

# API
curl -sf http://localhost:3000/api/health
# → {"status":"ok"}

# Orchestrator
curl -sf http://localhost:3011/health
# → {"status":"healthy","role":"control","mode":"queue-only"}

# LLM Gateway
curl -sf http://localhost:3010/health
# → {"status":"ok"}

# MCP
curl -sf http://localhost:3003/health
"
```

### 4.2 Public endpoints (desde internet)

```bash
# Verificar que Cloudflare Proxy no oculta errores
curl -sfI "https://api.op-sly.com/api/health"
# → 200 OK

curl -sfI "https://admin.op-sly.com"
# → 200 OK o 307 (login redirect)

curl -sfI "https://portal.op-sly.com"
# → 200 OK o 307 (login redirect)
```

### 4.3 Smoke tests locales

```bash
# Verificación de readiness post-deploy
./scripts/verify-production-readiness.sh

# Smoke tests funcionales
./scripts/production-smoke-tests.sh --api-url "https://api.op-sly.com"

# Verificar backups
./scripts/verify-backup-setup.sh --vps

# Verificar hardening
./scripts/harden-vps-check.sh
```

### 4.4 Verificar contenedores

```bash
ssh vps-dragon@100.120.151.91 "
  docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

  # Verificar logs de los últimos 30 segundos
  docker logs --tail 20 infra-app-1
  docker logs --tail 20 infra-orchestrator-1
"
```

### 4.5 Verificar Redis / colas

```bash
ssh vps-dragon@100.120.151.91 "
  redis-cli ping
  # → PONG

  redis-cli INFO stats | grep total_connections_received
"
```

---

## 5. Rollback Procedure

### 5.1 Rollback de imágenes (por SHA)

Si el deploy con `latest` falla, volver a un SHA conocido:

```bash
ssh vps-dragon@100.120.151.91 "

cd /opt/opsly

# 1. Identificar el SHA del commit estable
# Buscar en: https://github.com/cloudsysops/opsly/commits/main
# O localmente: git log --oneline -20

# 2. Taggear la imagen anterior como latest temporalmente
# (o editar .env con APP_IMAGE_TAG=sha)
STABLE_SHA=\"abc123def\"

# 3. Pull imagen específica
docker pull ghcr.io/cloudsysops/intcloudsysops-api:\${STABLE_SHA}

# 4. Taggear como latest
docker tag ghcr.io/cloudsysops/intcloudsysops-api:\${STABLE_SHA} ghcr.io/cloudsysops/intcloudsysops-api:latest

# 5. Recrear servicio
docker compose --env-file /opt/opsly/.env -f infra/docker-compose.platform.yml up -d --no-deps app
"
```

### 5.2 Rollback de código (git revert)

```bash
ssh vps-dragon@100.120.151.91 "

cd /opt/opsly

# 1. Revertir al commit anterior
git revert HEAD --no-edit

# 2. Sincronizar .env
doppler secrets download --project ops-intcloudsysops --config prd > .env

# 3. Reconstruir y desplegar
docker compose --env-file /opt/opsly/.env -f infra/docker-compose.platform.yml up -d --no-deps app admin portal
"
```

### 5.3 Rollback completo (a tag estable)

```bash
ssh vps-dragon@100.120.151.91 "

cd /opt/opsly

# Listar tags disponibles
git tag -l 'v*' | sort -V

# Checkout a tag estable anterior
git checkout v7.0.0-stable

# Sincronizar .env
doppler secrets download --project ops-intcloudsysops --config prd > .env

# Bajar stack y levantar de nuevo
docker compose --env-file /opt/opsly/.env -f infra/docker-compose.platform.yml down
docker compose --env-file /opt/opsly/.env -f infra/docker-compose.platform.yml up -d
"
```

### 5.4 Post-rollback verification

```bash
# Repetir sección 4 (Post-Deploy Verification)
# Notificar al equipo
doppler run --project ops-intcloudsysops --config prd -- \
  ./scripts/notify-discord.sh \
  "Rollback ejecutado" \
  "Deploy revertido a v7.0.0-stable. Investigar causa antes de reintentar." \
  "critical"
```

---

## 6. Tenant Deployment (Onboarding)

Después del deploy de core, verificar que los tenants existentes siguen funcionando y, si es necesario, agregar nuevos.

### 6.1 Verificar tenants existentes

```bash
# Listar contenedores de tenants
ssh vps-dragon@100.120.151.91 "docker ps --format 'table {{.Names}}\t{{.Status}}' | grep -E 'n8n_|uptime_'"

# Verificar health de cada tenant
for tenant in smiletripcare peskids localrank jkboterolabs intcloudsysops; do
  echo "=== ${tenant} ==="
  curl -sfI "https://n8n-${tenant}.op-sly.com" && echo " n8n OK" || echo " n8n FAIL"
  curl -sfI "https://uptime-${tenant}.op-sly.com" && echo " uptime OK" || echo " uptime FAIL"
done
```

### 6.2 Onboarding de nuevo tenant

```bash
# Desde la máquina local
doppler run --project ops-intcloudsysops --config prd -- \
  ./scripts/tenant/onboard.sh \
    --slug "nuevo-tenant" \
    --email "owner@example.com" \
    --plan "startup" \
    --name "Nombre del Tenant" \
    --yes

# Verificar URLs
curl -sfI "https://n8n-nuevo-tenant.op-sly.com"
curl -sfI "https://uptime-nuevo-tenant.op-sly.com"
```

### 6.3 Sincronizar workflows n8n

```bash
# Instalar CRM workflows por defecto
doppler run --project ops-intcloudsysops --config prd -- \
  ./scripts/sync-n8n-workflows.sh --tenant nuevo-tenant
```

---

## 7. Backup Verification

Después del deploy, verificar que el sistema de backups está operativo.

### 7.1 Verificar configuración de backups

```bash
# Verificar readiness de backup
doppler run --project ops-intcloudsysops --config prd -- \
  ./scripts/verify-backup-setup.sh --vps
```

### 7.2 Ejecutar backup manual

```bash
# Backup completo
doppler run --project ops-intcloudsysops --config prd -- \
  ./scripts/backup-tenants.sh
```

### 7.3 Verificar backups en S3

```bash
# Listar backups recientes
aws s3 ls "s3://${S3_BUCKET}/opsly/backups/$(date -u +%Y-%m-%d)/" --human-readable
```

---

## 8. Monitoring Setup

### 8.1 Verificar health checks

```bash
# Verificar que los endpoints de health responden
curl -sf "https://api.op-sly.com/api/health" | jq .
```

### 8.2 Configurar alertas

```bash
# Activar health check watchdog
ssh vps-dragon@100.120.151.91 "
  # Verificar que el watchdog está corriendo
  systemctl status opsly-watchdog 2>/dev/null || echo 'watchdog not installed'

  # Verificar health daemon de LLM Gateway
  curl -sf http://localhost:3010/health | jq '.cache_hits // empty'
"
```

### 8.3 Grafana (si está configurado)

```bash
# Verificar acceso a métricas
ssh vps-dragon@100.120.151.91 "
  curl -sf http://localhost:9090/api/v1/query?query=up 2>/dev/null | jq '.data.result | length'
"
# → Número de targets monitoreados
```

### 8.4 Discord / notificaciones

```bash
# Probar webhook de Discord
doppler run --project ops-intcloudsysops --config prd -- \
  ./scripts/notify-discord.sh \
  "Deploy completado" \
  "Core desplegado correctamente en producción" \
  "success"
```

---

## 9. Emergency Contacts

| Rol              | Contacto                          | Medio       |
|------------------|-----------------------------------|-------------|
| Operations Lead  | cboteros (GitHub)                 | Discord/Git |
| DevOps           | vps-dragon@100.120.151.91 (SSH)   | Tailscale   |
| DB Admin         | Supabase project dashboard        | Web         |
| DNS / Cloudflare | Cloudflare dashboard              | Web         |
| Stripe Admin     | Stripe dashboard                  | Web         |
| Doppler Admin    | Doppler dashboard                 | Web         |

**Canales de comunicación:**
- Discord: `#opsly-deployments` (automático), `#opsly-monitoring` (alertas), `#opsly-incidents` (emergencias)
- GitHub Issues: Usar label `production` + `bug` para incidentes de producción

---

## 10. Playbook for Common Failures

### 10.1 Disco lleno (disk full)

**Síntoma:** `df -h /` muestra > 90% de uso. Docker pull falla con `no space left on device`.

**Resolución:**

```bash
ssh vps-dragon@100.120.151.91 "

# 1. Limpieza Docker (segura)
docker image prune -af --filter 'until=24h'
docker builder prune -af
docker container prune -f

# 2. Logs rotados
sudo journalctl --vacuum-time=3d

# 3. Verificar resultado
df -h /
"
```

**Si no es suficiente:**

```bash
ssh vps-dragon@100.120.151.91 "
  # Verificar qué ocupa más espacio
  sudo du -xh /var --max-depth=2 | sort -h | tail -20

  # Limpiar logs de Docker
  sudo sh -c 'truncate -s 0 /var/lib/docker/containers/*/*-json.log'
"
```

**Prevención:** Instalar timer de limpieza:
```bash
./scripts/install-opsly-disk-maintain-timer.sh
```

### 10.2 Stripe webhook failure

**Síntoma:** Pagos no procesados, errores 500 en `/api/webhooks/stripe`, usuarios no pueden facturar.

**Diagnóstico:**

```bash
ssh vps-dragon@100.120.151.91 "
  # Ver logs de API
  docker logs infra-app-1 --tail 50 | grep -i 'stripe\|webhook'

  # Verificar que STRIPE_SECRET_KEY está definida
  docker exec infra-app-1 env | grep STRIPE
"
```

**Resolución:**

```bash
# 1. Verificar webhook endpoints en Stripe Dashboard
#    → https://dashboard.stripe.com/webhooks
#    → Debe apuntar a: https://api.op-sly.com/api/webhooks/stripe

# 2. Si el endpoint cambió, re-registrar en Stripe
#    → Add endpoint → URL: https://api.op-sly.com/api/webhooks/stripe
#    → Eventos: customer.subscription.*, invoice.*, checkout.session.completed

# 3. Verificar firma del webhook
#    → Doppler: STRIPE_WEBHOOK_SECRET debe coincidir con Stripe Dashboard
doppler secrets set STRIPE_WEBHOOK_SECRET="whsec_..." \
  --project ops-intcloudsysops --config prd

# 4. Recrear contenedor de API
ssh vps-dragon@100.120.151.91 "
  cd /opt/opsly
  doppler secrets download --project ops-intcloudsysops --config prd > .env
  docker compose --env-file /opt/opsly/.env -f infra/docker-compose.platform.yml up -d --no-deps app
"
```

### 10.3 Redis down

**Síntoma:** BullMQ jobs no se procesan, orchestrator reporta errores de conexión, health check de Redis falla.

**Diagnóstico:**

```bash
ssh vps-dragon@100.120.151.91 "
  # Verificar contenedor Redis
  docker ps | grep redis

  # Ver logs de Redis
  docker logs infra-redis-1 --tail 20

  # Intentar conexión directa
  redis-cli -h localhost -p 6379 ping
"
```

**Resolución:**

```bash
# 1. Si Redis no responde, reiniciar
ssh vps-dragon@100.120.151.91 "
  cd /opt/opsly
  docker compose --env-file /opt/opsly/.env -f infra/docker-compose.platform.yml restart redis

  sleep 3
  redis-cli ping
  # → PONG
"

# 2. Verificar persistencia (RDB/AOF)
ssh vps-dragon@100.120.151.91 "
  docker exec infra-redis-1 redis-cli INFO persistence
  # → rdb_last_save_time debe ser reciente
"

# 3. Si Redis está irrecuperable, restaurar desde backup
#    Los datos en Redis son colas de jobs (recreables) y cache (regenerable)
#    El risk es pérdida de jobs en tránsito — re-encolar manualmente
```

### 10.4 Health endpoint 503 / API caída

**Síntoma:** `curl https://api.op-sly.com/api/health` devuelve 503, timeout, o error.

**Diagnóstico:**

```bash
ssh vps-dragon@100.120.151.91 "
  # Ver logs del contenedor
  docker logs infra-app-1 --tail 50

  # Ver si Traefik está recibiendo tráfico
  docker logs infra-traefik-1 --tail 20 | grep 'api.op-sly.com'

  # Verificar que el puerto 3000 responde internamente
  curl -sf http://localhost:3000/api/health
"
```

**Resolución:**

```bash
# 1. Si el contenedor está caído pero la imagen es correcta
ssh vps-dragon@100.120.151.91 "
  cd /opt/opsly
  docker compose --env-file /opt/opsly/.env -f infra/docker-compose.platform.yml up -d --no-deps app
"

# 2. Si hay error de Node/Next (revisar logs)
#    Solución temporal: reiniciar
ssh vps-dragon@100.120.151.91 "
  docker compose --env-file /opt/opsly/.env -f infra/docker-compose.platform.yml restart app
"

# 3. Si el problema es la imagen (built incorrecta)
#    Seguir rollback procedure (sección 5)
```

### 10.5 Orchestrator / colas bloqueadas

**Síntoma:** Jobs encolados pero no se procesan. Redis `LLEN bull:orchestrator:jobs:*` crece.

**Diagnóstico:**

```bash
ssh vps-dragon@100.120.151.91 "
  # Ver colas
  redis-cli --raw KEYS 'bull:*' | head -20

  # Ver workers activos
  docker logs infra-orchestrator-1 --tail 20

  # Estadísticas de cola
  redis-cli INFO stats | grep -E 'total_connections|rejected_connections'
"
```

**Resolución:**

```bash
# 1. Si el orchestrator no está procesando, reiniciar el worker
ssh vps-dragon@100.120.151.91 "
  docker compose --env-file /opt/opsly/.env -f infra/docker-compose.platform.yml restart orchestrator

  # Verificar que retoma jobs
  sleep 5
  docker logs infra-orchestrator-1 --tail 10
"

# 2. Si hay jobs stuck (en estado 'active' por >5 min), limpiar
#    NOTA: Esto puede perder jobs. Usar solo si es necesario.
ssh vps-dragon@100.120.151.91 "
  redis-cli --raw LRANGE 'bull:orchestrator:active' 0 -1 | head -20
  # Si hay jobs stuck::
  redis-cli DEL 'bull:orchestrator:active'
"
```

### 10.6 DNS / Cloudflare Proxy OFF

**Síntoma:** `dig api.op-sly.com` resuelve a `157.245.223.7` (IP real del VPS) en vez de una IP de Cloudflare.

**Riesgo:** IP del VPS expuesta, SSH accesible desde internet, mayor riesgo de ataque DDoS.

**Resolución:**

```bash
# 1. Ir a Cloudflare Dashboard → DNS
#    → Asegurar que el ícono de nube está NARANJA (Proxy ON)
#    → Registrar: api.op-sly.com, admin.op-sly.com, portal.op-sly.com
#      n8n-*.op-sly.com, uptime-*.op-sly.com

# 2. Verificar el cambio
dig api.op-sly.com +short
# → Debe resolver a 104.x.x.x o 172.64.x.x (IPs de Cloudflare)

# 3. Usar script de verificación
./scripts/cloudflare-proxy.sh --check
```

### 10.7 Supabase connection failure

**Síntoma:** API logs muestran `Supabase query failed` o `permission denied for schema platform`.

**Diagnóstico:**

```bash
ssh vps-dragon@100.120.151.91 "
  docker logs infra-app-1 --tail 30 | grep -i 'supabase\|postgrest\|permission denied'
"
```

**Resolución:**

```bash
# 1. Validar service role key
doppler run --project ops-intcloudsysops --config prd -- \
  ./scripts/validate-config.sh

# 2. Si el schema platform no está expuesto en PostgREST:
#    Ir a Supabase Dashboard → Settings → API → Schema → agregar "platform"

# 3. Si hay migraciones pendientes:
npx supabase db push --linked

# 4. Recrear contenedor API
ssh vps-dragon@100.120.151.91 "
  cd /opt/opsly
  doppler secrets download --project ops-intcloudsysops --config prd > .env
  docker compose --env-file /opt/opsly/.env -f infra/docker-compose.platform.yml up -d --no-deps app
"
```

---

## Anexo: Comandos Rápidos

```bash
# === PRE-DEPLOY ===
npm run type-check                          # TypeScript check
npm run test                                # Tests unitarios
npm run validate-openapi                    # OpenAPI spec check
./scripts/verify-production-readiness.sh    # Readiness score

# === DEPLOY ===
# Automático
git push origin main                        # Dispara CI/CD

# Manual
ssh vps-dragon@100.120.151.91 "
  cd /opt/opsly
  git fetch origin main && git reset --hard origin/main
  doppler secrets download --project ops-intcloudsysops --config prd > .env
  docker compose --env-file .env -f infra/docker-compose.platform.yml pull
  docker compose --env-file .env -f infra/docker-compose.platform.yml up -d --no-deps app admin portal
"

# === POST-DEPLOY ===
ssh vps-dragon@100.120.151.91 "
  curl -sf localhost:3000/api/health
  curl -sf localhost:3011/health
  docker ps --format 'table {{.Names}}\t{{.Status}}'
"
./scripts/production-smoke-tests.sh
./scripts/verify-backup-setup.sh --vps

# === ROLLBACK ===
STABLE=\"abc123def\"
ssh vps-dragon@100.120.151.91 "
  docker pull ghcr.io/cloudsysops/intcloudsysops-api:\${STABLE}
  docker tag ghcr.io/cloudsysops/intcloudsysops-api:\${STABLE} ghcr.io/cloudsysops/intcloudsysops-api:latest
  docker compose --env-file /opt/opsly/.env -f infra/docker-compose.platform.yml up -d --no-deps app
"

# === TENANT ===
doppler run --project ops-intcloudsysops --config prd -- \
  ./scripts/tenant/onboard.sh --slug \"tenant\" --email \"a@b.com\" --plan startup --yes

# === BACKUP ===
doppler run --project ops-intcloudsysops --config prd -- \
  ./scripts/backup-tenants.sh

doppler run --project ops-intcloudsysops --config prd -- \
  ./scripts/verify-backup-setup.sh --vps
```

---

## Referencias

- `docs/runbooks/BACKUP-RECOVERY.md` — Procedimientos de backup y restore
- `docs/runbooks/DEPLOY-GITHUB-ACTIONS.md` — Configuración de GitHub Actions + Tailscale
- `docs/runbooks/DEPLOYMENT-CHECKLIST.md` — Checklist detallado de deploy
- `docs/runbooks/TENANT-PRODUCTION-CHECKLIST.md` — Checklist para tenants
- `docs/runbooks/TENANT-ONBOARDING-TRIAGE.md` — Triage de onboarding
- `docs/runbooks/SECRET-ROTATION-AFTER-EXPOSURE.md` — Rotación de secretos
- `docs/runbooks/INCIDENT-AUTONOMOUS-AGENT.md` — Manejo de incidentes
- `scripts/verify-production-readiness.sh` — Script de verificación
- `.github/workflows/deploy.yml` — Workflow de deploy
- `config/opsly.config.json` — Configuración central

---

**Last Updated:** 2026-05-28
**Maintained By:** Operations
**Contact:** #opsly-deployments on Discord
