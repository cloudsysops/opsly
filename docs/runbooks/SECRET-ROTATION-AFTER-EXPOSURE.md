# Rotación de secretos tras exposición (chat, logs, tickets)

Objetivo: asumir que cualquier secreto mostrado en una sesión compartida (Cursor, Slack, terminal grabado) está **comprometido** y debe rotarse sin volcar valores nuevos en el chat.

## Principios

- Rotar en **Doppler** primario (`ops-intcloudsysops` / config `prd`); el VPS debe volver a obtener `.env` con `./scripts/vps-bootstrap.sh` (o flujo documentado del equipo), **nunca** pegar claves en issues ni commits.
- Tras rotar **Redis**, actualizar `REDIS_PASSWORD` y `REDIS_URL` si incluye password; recrear servicios que usen Redis para que lean el nuevo valor.
- Tras rotar **Cloudflare API token**, revocar el token antiguo en Cloudflare Dashboard y actualizar `CF_DNS_API_TOKEN` en Doppler; recrear Traefik con `docker compose --env-file /opt/opsly/.env -f infra/docker-compose.platform.yml up -d --force-recreate traefik`.

## Orden sugerido (ejemplo)

1. **Cloudflare:** Profile → API Tokens → revocar token expuesto → crear token nuevo (permiso Zone DNS Edit en la zona correcta) → `doppler secrets set CF_DNS_API_TOKEN --project ops-intcloudsysops --config prd` (stdin).
2. **Redis:** Generar password nuevo → `doppler secrets set REDIS_PASSWORD` y alinear `REDIS_URL` si aplica → bootstrap VPS → `docker compose --env-file /opt/opsly/.env -f infra/docker-compose.platform.yml up -d --force-recreate redis` y servicios dependientes (orchestrator, app, etc.) según impacto.
3. **Verificación:** comprobar servicios con variables cargadas solo desde entorno seguro en el VPS, no desde historial compartido.

## Referencias

- Variables: [docs/DOPPLER-VARS.md](../DOPPLER-VARS.md)
- Traefik / token: [docs/04-infrastructure/CLOUDFLARE-PROXY-ACTIVATION.md](../04-infrastructure/CLOUDFLARE-PROXY-ACTIVATION.md)
