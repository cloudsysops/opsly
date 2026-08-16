---
status: draft
owner: operations
last_review: 2026-08-05
type: runbook
tags:
  - opsly/runbook
---

# Deploy desde GitHub Actions → VPS

Objetivo: que el job **Deploy** (`.github/workflows/deploy.yml`) llegue al VPS por SSH, ejecute `docker compose pull/up` y pase el health check HTTPS.

Los workflows usan la composite **`.github/actions/tailscale-connect`** (`tailscale/github-action@v4`): hostname `opsly-gha-<run_id>`, ping al VPS y logout al terminar el job.

## Síntoma habitual: `dial tcp …:22: i/o timeout`

El runner de GitHub **no está en tu tailnet**. Si el VPS solo acepta SSH desde Tailscale (UFW) o `VPS_HOST` apunta a una IP **100.x** sin join previo, la conexión TCP a `:22` hace timeout.

## Síntoma: admin Tailscale lleno de `github-runner*` offline

La auth key de CI **no es ephemeral**. Cada deploy deja un nodo muerto en la lista.

**Arreglo (humano, 2 min):**

1. [Tailscale → Settings → Keys](https://login.tailscale.com/admin/settings/keys): crear auth key **Reusable + Ephemeral** (y tag en la clave/ACL si tu política lo exige).
2. GitHub → Secrets → actualizar `TAILSCALE_AUTHKEY` con la clave nueva; revocar la anterior.
3. Limpiar basura actual:
   - Manual: [Machines](https://login.tailscale.com/admin/machines) → borrar `github-runner*` offline.
   - O con API: `TAILSCALE_API_KEY=… ./scripts/ops/cleanup-tailscale-github-runners.sh` (dry-run) y luego `--execute`.

Con clave ephemeral, los nodos `opsly-gha-*` desaparecen solos tras el logout del action.

**Mejor aún (recomendado Tailscale):** OAuth client con `auth_keys` + `tag:ci` y pasar `oauth-client-id` / `oauth-secret` / `tags` al action (ver [docs oficiales](https://tailscale.com/docs/integrations/github/github-action)). Hoy el repo sigue con `TAILSCALE_AUTHKEY` por compatibilidad.

## Configuración recomendada (SSH vía Tailscale)

1. Auth key **reusable + ephemeral** (paso de arriba).
2. ACL: permitir que el runner llegue al VPS (`vps-dragon` / `100.120.151.91`).
3. GitHub secrets (`production` / `staging` si aplica):
   - `TAILSCALE_AUTHKEY`
   - `VPS_HOST` (IP Tailscale del VPS, p. ej. `100.120.151.91`, o MagicDNS)
   - Opcional `VPS_SSH_HOST` (solo SSH; si no, usa `VPS_HOST`)
   - `VPS_USER`, `VPS_SSH_KEY`

El paso Tailscale corre **solo** si `TAILSCALE_AUTHKEY` no está vacío. SSH usa **timeout 2m**.

## Rollback rápido de imagen API

Las imágenes se publican también con tag `${{ github.sha }}` además de `latest`. En el VPS, para volver a un commit conocido:

```bash
cd /opt/opsly/infra
# Sustituir SHA por el commit estable
docker compose --env-file /opt/opsly/.env -f docker-compose.platform.yml pull app
docker compose --env-file /opt/opsly/.env -f docker-compose.platform.yml up -d --no-deps app
```

(Ajusta el nombre del servicio si en tu `docker-compose.platform.yml` el servicio API no se llama `app`.)

## Verificación manual post-deploy

El job **Deploy** comprueba health en dos sitios: probe local Traefik en el VPS (`Host: api.${PLATFORM_DOMAIN}` a `127.0.0.1`) y luego `https://api.${PLATFORM_DOMAIN}/api/health` **desde el runner**. No uses el curl público *desde el VPS* como criterio de fallo: Cloudflare hairpin suele devolver error con la API ya sana.

```bash
curl -sfk "https://api.${PLATFORM_DOMAIN}/api/health"
```

Sustituye `PLATFORM_DOMAIN` por el dominio base (mismo valor que en Doppler / secret `PLATFORM_DOMAIN`).

---

## Enlaces relacionados

- [[runbooks/README|runbooks]]
- [[brain/README|Brain Central]]
- `scripts/ops/cleanup-tailscale-github-runners.sh`
- `.github/actions/tailscale-connect/`
