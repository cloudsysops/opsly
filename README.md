# intcloudsysops

Plataforma multi-tenant tipo **Opsly**: plano de control (API, billing, orquestación) y plano de datos (stacks Docker aislados por cliente detrás de Traefik).

## Architecture

Referencia conceptual **Opsly**: el **control plane** decide ciclo de vida, facturación y políticas; el **data plane** ejecuta cargas de trabajo por tenant (contenedores, redes, volúmenes y rutas TLS).

| Plano | Rol | Componentes típicos |
|-------|-----|----------------------|
| Control plane | Checkout Stripe, webhooks, colas, API admin, Supabase | Next.js API, Redis/BullMQ, scripts, dashboard |
| Data plane | Aislamiento por tenant | Compose por slug, Traefik, n8n, uptime, volúmenes dedicados |

## Prerequisites

- VPS Ubuntu 24 con Docker (y Docker Compose plugin) instalado
- Dominio con DNS wildcard al VPS (`*.yourdomain.com` → IP pública)
- Proyecto Supabase (Postgres + Auth según uso)
- Cuenta Stripe con productos/precios y webhook configurado
- Cuenta Doppler (recomendado para secretos en VPS y CI)

## Setup

Activar hooks de git (requerido para sincronizar contexto tras cada commit):

```bash
git config core.hooksPath .githooks
```

También se configura automáticamente al ejecutar `./scripts/local-setup.sh`.

## Quickstart

1. `git clone <repo-url> && cd intcloudsysops`
2. `cp .env.example .env` y completar variables (o `doppler secrets download` al archivo esperado por Compose)
3. `docker network create traefik-public`
4. `supabase db push` (CLI autenticado contra tu proyecto)
5. `docker compose -f infra/docker-compose.platform.yml up -d`
6. `curl -sf https://api.<TU_DOMINIO>/api/health`
7. Abrir el dashboard admin en `https://admin.<TU_DOMINIO>` (según cómo publiques `apps/admin`; en local: `cd apps/admin && npm run dev`)
8. Onboard de prueba: `./scripts/onboard-tenant.sh --slug demo --email you@email.com --plan startup --dry-run`
9. Quitar `--dry-run` cuando la revisión sea correcta

## Local Development

> Entorno: Mac 2011 (16 GB RAM, Colima) como servidor local.
> Acceso desde cualquier máquina en la misma red.

### Requisitos previos

- Colima instalado (`brew install colima`)
- Docker plugin (`brew install docker`)
- Supabase CLI (`brew install supabase/tap/supabase`)
- Node 20 (`brew install node@20`)
- jq (`brew install jq`)

### Setup (una sola vez)

```bash
# 1. Clonar y preparar
git clone https://github.com/tu-org/intcloudsysops.git
cd intcloudsysops

# 2. Setup completo automatizado
./scripts/local-setup.sh
```

El script hace todo:

- Inicia Colima si no está corriendo
- Levanta Supabase local y aplica migraciones
- Configura `.env.local` con las claves de Supabase
- Construye y levanta el stack completo

### Acceso desde otra máquina en la red

```bash
# En la Mac servidor (2011) — obtener IP y mostrar instrucciones
./scripts/tunnel-access.sh --mode server

# En la Mac cliente (2020) — configurar /etc/hosts y verificar
sudo ./scripts/tunnel-access.sh --mode client --mac2011-ip 192.168.1.X
```

### URLs locales

| Servicio | URL | Notas |
|---------|-----|-------|
| Dashboard Admin | http://admin.opsly.local | Login con Supabase Auth |
| API Health | http://api.opsly.local/api/health | Sin auth |
| Traefik Dashboard | http://localhost:8080 | Solo desde Mac 2011 |
| Supabase Studio | http://localhost:54321 | Solo desde Mac 2011 |
| n8n (primer tenant) | http://localhost:8000 | Tras primer onboard |

### Primer tenant de prueba

```bash
./scripts/onboard-tenant.sh \
  --slug demo \
  --email dev@test.com \
  --plan startup \
  --yes
```

### Comandos útiles en local

```bash
# Ver estado del stack
docker compose -f infra/docker-compose.local.yml ps

# Logs de la API
docker compose -f infra/docker-compose.local.yml logs api -f

# Reiniciar solo la API tras cambios
docker compose -f infra/docker-compose.local.yml up -d --no-deps --build api

# Parar todo
docker compose -f infra/docker-compose.local.yml down

# Reset completo (borra volúmenes)
docker compose -f infra/docker-compose.local.yml down -v
supabase db reset
```

## Tenant Lifecycle

```
Stripe Checkout / Customer
        │
        ▼
Webhook (checkout.session.completed, invoices, etc.)
        │
        ▼
Provision (cola → Docker Compose tenant)
        │
        ▼
     Active ◄────────────────────────┐
        │                            │
        ▼                            │
   Suspend (pago / política)         │
        │                            │
        ▼                            │
     Resume ─────────────────────────┘
        │
        ▼
     Delete (cleanup compose + datos según política)
```

## Scripts Reference

| Script | Descripción | Flags principales |
|--------|-------------|-------------------|
| `scripts/onboard-tenant.sh` | Alta de tenant y provisión | `--slug`, `--email`, `--plan`, `--dry-run`, `--stripe-customer-id` |
| `scripts/suspend-tenant.sh` | Suspende runtime del tenant | `--slug`, `--dry-run` |
| `scripts/backup-tenants.sh` | Respalda tenants activos a S3 | `--dry-run`, variables `S3_*` / `DB_CONNECTION_STRING` |
| `scripts/restore-tenant.sh` | Restaura desde S3 | `--slug`, `--date`, `--dry-run` |
| `scripts/cleanup-demos.sh` | Limpia demos vía API | `--dry-run` |
| `scripts/validate-config.sh` | Valida JSON, DNS, Doppler críticos, SSH al VPS | Sin flags |
| `scripts/vps-bootstrap.sh` | Descarga Doppler → `.env` en el VPS, red Traefik, dirs | Ejecutar en el VPS como `vps-dragon` |
| `scripts/vps-refresh-api-env.sh` | Bootstrap + recrea servicio `app` (tras cambiar secretos en prd) | `--dry-run`, `--skip-resend-check` |
| `scripts/test-e2e-invite-flow.sh` | Smoke contra API pública (health + POST invitaciones) | `--dry-run`, `--api-url`, requiere `ADMIN_TOKEN` / `OWNER_EMAIL` |

## Environment Variables Reference

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `PLATFORM_DOMAIN` | Sí | Dominio base (API en `api.`, Traefik, certificados). |
| `PLATFORM_ADMIN_TOKEN` | Sí | Bearer para endpoints y scripts de operación. |
| `NEXT_PUBLIC_SUPABASE_URL` | Sí (admin) | URL del proyecto Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sí (admin) | Clave anon para Auth en el browser. |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí | Servidor: provisioning, RLS bypass controlado. |
| `STRIPE_SECRET_KEY` | Sí | API Stripe. |
| `STRIPE_WEBHOOK_SECRET` | Sí | Verificación de firma del webhook. |
| `STRIPE_PRICE_*` | Sí | IDs de precio por plan. |
| `REDIS_PASSWORD` / `REDIS_URL` | Sí | Cola y caché (Compose inyecta URL interna al API). |
| `PLATFORM_TENANTS_HOST_PATH` | Sí (Compose) | Ruta en el host montada en el API para datos de tenants. |
| `TEMPLATE_PATH` / `TENANTS_PATH` | Scripts | Plantilla compose y directorio de stacks. |
| `ACME_EMAIL` | Sí (Traefik) | Email Let’s Encrypt. |
| `TRAEFIK_DASHBOARD_BASIC_AUTH_USERS` | Sí | Usuarios htpasswd para dashboard Traefik. |
| `NEXT_PUBLIC_API_URL` | Sí (admin) | URL pública del API. |
| `NEXT_PUBLIC_PLATFORM_ADMIN_TOKEN` | Sí (admin) | Mismo valor que `PLATFORM_ADMIN_TOKEN` (navegador). |
| `DB_CONNECTION_STRING` | Backups | Postgres para `pg_dump`. |
| `S3_BUCKET`, `S3_PREFIX`, `AWS_*` | Backups | Destino en S3. |
| `RESEND_API_KEY` | Sí (invitaciones) | API de Resend; valor completo desde el dashboard (no placeholder corto). |
| `RESEND_FROM_EMAIL` / `RESEND_FROM_ADDRESS` | Sí (invitaciones) | Remitente; la API exige al menos uno de los dos. |
| `DISCORD_WEBHOOK_URL` | No | Notificaciones operativas. |
| `DOPPLER_TOKEN` | Opcional | Inyección de secretos en runtime. |

<!-- URLS_START -->
### URLs de producción (`config/opsly.config.json`)

| Entorno | URL |
|---------|-----|
| Dominio base | `https://ops.smiletripcare.com` |
| API | `https://api.ops.smiletripcare.com` |
| Admin | `https://admin.ops.smiletripcare.com` |
| Traefik dashboard | `https://traefik.ops.smiletripcare.com` |
| Wildcard tenants | `*.ops.smiletripcare.com` |
<!-- URLS_END -->

## Deployment

El workflow `.github/workflows/deploy.yml` se dispara en **push a `main`** o manualmente con **`workflow_dispatch`** (input `skip_tests` para saltar lint/typecheck). Los jobs validan tipos, ejecutan ESLint si hay configuración, construyen `apps/api` y `apps/admin`, y luego el job **deploy** (environment `production`) se conecta por **SSH** al VPS, hace `git fetch`/`reset` a `main`, `npm ci`, builds y `docker compose … up` solo del servicio **app**, dejando Traefik y Redis arriba.

Los secretos **`VPS_HOST`**, **`VPS_USER`**, **`VPS_SSH_KEY`** y **`DISCORD_WEBHOOK_URL`** deben existir en GitHub; **`PLATFORM_DOMAIN`** se recomienda como secret para el `curl` de health post-deploy. El resto del `.env` de producción debe vivir en el VPS vía **Doppler** (o equivalente), no duplicado en el YAML.

Tras el despliegue, el pipeline espera y llama `https://api.<PLATFORM_DOMAIN>/api/health`; notifica a Discord en éxito o fallo (pasos con `continue-on-error` si el webhook no está configurado).

## Troubleshooting

| Problema | Qué revisar |
|----------|-------------|
| Los contenedores `app` no arrancan | `docker compose -f infra/docker-compose.platform.yml logs app`; Redis healthy; variables en `.env` montado por Compose. |
| Traefik no emite certificado | `ACME_EMAIL`, puertos 80/443, DNS `A`/`AAAA` y propagación; logs de Traefik y volumen `letsencrypt`. |
| Webhook Stripe falla o no provisiona | URL pública, `STRIPE_WEBHOOK_SECRET`, cuerpo crudo sin proxy que lo altere; logs del API en `/api/webhooks/stripe`. |
| Admin redirige siempre a `/login` | `NEXT_PUBLIC_SUPABASE_*` correctas, cookies en dominio, middleware y proyecto Supabase Auth. |
| Backup no sube a S3 | `S3_BUCKET`, `AWS_REGION`, credenciales IAM, prefijo `S3_PREFIX`; probar `aws s3 ls` desde el mismo entorno. |
| Health check del deploy falla | `PLATFORM_DOMAIN` en el servidor o secret `PLATFORM_DOMAIN` en GitHub; firewall; réplicas del servicio `app` y tiempo de arranque. |
| Invitaciones portal → 500 *API key is invalid* | `RESEND_API_KEY` completa en Doppler `prd`; `./scripts/validate-config.sh` avisa si parece corta; luego `./scripts/vps-refresh-api-env.sh` en local (SSH al VPS). |

## License

MIT
