# Deploy desde GitHub Actions → VPS

Objetivo: que el job **Deploy** (`.github/workflows/deploy.yml`) llegue al VPS por SSH, ejecute `docker compose pull/up` y pase el health check HTTPS.

## Síntoma habitual: `dial tcp …:22: i/o timeout`

El runner de GitHub **no está en tu tailnet**. Si el VPS solo acepta SSH desde Tailscale (UFW) o `VPS_HOST` apunta a una IP **100.x** sin join previo, la conexión TCP a `:22` hace timeout.

## Configuración recomendada (SSH vía Tailscale)

1. En [Tailscale admin](https://login.tailscale.com/admin/settings/keys): crear **auth key** reusable + ephemeral. El tag (si aplica) puede ir **en la clave** y en la ACL; el workflow **no** fuerza `tag:github-actions` — evita fallos si tu red no declara ese tag. Si tu instalación exige pasar tags al `tailscale up` del action, añade el input en el workflow o usa una clave pre-etiquetada según la doc de Tailscale.
2. En la política ACL de Tailscale, permitir que el nodo del runner (una vez unido) llegue al nodo del VPS (por tag, usuario o `autogroup:member` según tu modelo).
3. En GitHub → **Settings → Secrets and variables → Actions** (entornos `production` / `staging` si aplica):
   - `TAILSCALE_AUTHKEY`: la clave del paso 1.
   - `VPS_HOST`: dirección alcanzable **después** del join (típicamente IP Tailscale del VPS, p. ej. `100.120.151.91`, o nombre MagicDNS si está habilitado).
   - Opcional: `VPS_SSH_HOST`: si lo defines, `appleboy/ssh-action` usa **solo** este valor como host SSH; si no, usa `VPS_HOST`. Útil si quieres separar “host para health/DNS” de “host para SSH”.
   - `VPS_USER`, `VPS_SSH_KEY`: sin cambios.

El workflow ejecuta `tailscale/github-action@v2` **solo** cuando `TAILSCALE_AUTHKEY` no está vacío; si no usas Tailscale en CI, deja el secreto vacío y abre SSH al runner (menos recomendado). El paso SSH usa **timeout de conexión 2m** (antes 30s) para redes lentas.

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

```bash
curl -sfk "https://api.${PLATFORM_DOMAIN}/api/health"
```

Sustituye `PLATFORM_DOMAIN` por el dominio base (mismo valor que en Doppler / secret `PLATFORM_DOMAIN`).
