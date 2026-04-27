# CI/CD → VPS (GitHub Actions)

## Flujo automático (workflow **Deploy**)

| Rama          | Tras `lint-and-typecheck` | Imágenes GHCR                | VPS                                                                     |
| ------------- | ------------------------- | ---------------------------- | ----------------------------------------------------------------------- |
| **`staging`** | Sí                        | Tags **`:staging`** y `:sha` | `/opt/opsly-staging` — `git` en rama `staging`, `docker compose ... up` |
| **`main`**    | Sí                        | Tags **`:latest`** y `:sha`  | `/opt/opsly` — `git` en `main`, compose producción                      |

- **Staging primero:** integrá cambios en la rama `staging` y hacé **push**; si el workflow pasa, el VPS staging recibe el compose sin tocar producción.
- **Producción:** merge (o push) a **`main`** cuando el código esté validado; el mismo workflow construye y despliega **prod** solo para `main`.

El job **Deploy Node/PM2** (`deploy-pm2-vps`) está **desactivado** (`if: false`) para no duplicar despliegues con `npm`/`pm2` en el VPS. El camino oficial es **Docker + compose**.

## Trabajo manual en el VPS (SSH)

Antes de editar archivos, ejecutar scripts o `compose` a mano: **`git pull` / `./scripts/git-sync-repo.sh`** en `/opt/opsly` (rama `main`) o `/opt/opsly-staging` (rama `staging`) para alinear el árbol con `origin`. El deploy por CI ya hace `reset --hard`; esto evita divergencias cuando operás fuera de Actions. Ver **`docs/SESSION-GIT-SYNC.md`**.

## Secretos GitHub (repositorio o entornos)

| Secret                                | Uso                                                                                                                                                                                    |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` | SSH al VPS                                                                                                                                                                             |
| `PLATFORM_DOMAIN`                     | Prod: dominio base; health `https://api.$PLATFORM_DOMAIN/api/health`                                                                                                                   |
| `STAGING_PLATFORM_DOMAIN`             | Staging: mismo concepto que `PLATFORM_DOMAIN` pero para el stack en `/opt/opsly-staging` (DNS + Traefik). Si falta, el build staging usa `PLATFORM_DOMAIN` con **warning** en Actions. |
| `NEXT_PUBLIC_*`, etc.                 | Igual que hoy para builds                                                                                                                                                              |

Entornos recomendados en GitHub: **`staging`** (deploy staging) y **`production`** (deploy prod) para reglas de aprobación opcionales.

## Preparar el VPS: `/opt/opsly-staging`

1. **DNS:** `api.<STAGING_PLATFORM_DOMAIN>` y subdominios necesarios (admin, portal, …) apuntando al mismo VPS que prod o al que corresponda.
2. **Clon y rama:** el workflow clona en `/opt/opsly-staging` si no existe y hace `reset --hard origin/staging`.
3. **`.env` en el VPS** (p. ej. desde Doppler `stg` o fichero local) con imágenes **`:staging`**:

```bash
# Ejemplo — ajustar org y dominio (debe coincidir con STAGING_PLATFORM_DOMAIN en GitHub)
PLATFORM_DOMAIN=staging.tu-dominio-base.com
APP_IMAGE=ghcr.io/cloudsysops/intcloudsysops-api:staging
ADMIN_APP_IMAGE=ghcr.io/cloudsysops/intcloudsysops-admin:staging
PORTAL_APP_IMAGE=ghcr.io/cloudsysops/intcloudsysops-portal:staging
MCP_IMAGE=ghcr.io/cloudsysops/intcloudsysops-mcp:staging
LLM_GATEWAY_IMAGE=ghcr.io/cloudsysops/intcloudsysops-llm-gateway:staging
ORCHESTRATOR_IMAGE=ghcr.io/cloudsysops/intcloudsysops-orchestrator:staging
CONTEXT_BUILDER_IMAGE=ghcr.io/cloudsysops/intcloudsysops-context-builder:staging
# Redis, Supabase, Stripe, etc. según tu config staging (p. ej. Doppler config stg)
```

4. **Traefik / TLS:** mismos principios que prod (`infra/docker-compose.platform.yml`); el `PLATFORM_DOMAIN` del `.env` staging debe coincidir con labels y DNS.

## Workflow antiguo `deploy-staging.yml`

El disparo por `workflow_run` tras CI en `main` quedó **obsoleto** frente al modelo “push a `staging` → VPS staging”. Usá el workflow **Deploy** en la rama `staging` o revisá si querés dejar solo `workflow_dispatch` en ese archivo.

## Comprobación manual

```bash
# Tras un deploy exitoso en Actions
curl -sfk "https://api.${STAGING_PLATFORM_DOMAIN}/api/health"
curl -sfk "https://api.${PLATFORM_DOMAIN}/api/health"
```
