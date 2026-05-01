# Domain cutover runbook: `op-sly.com`

Objetivo: activar `op-sly.com` con Cloudflare DNS autoritativo y Traefik ACME DNS-01.

## Requisitos previos

- Dominio base final: `op-sly.com`
- VPS Opsly accesible por SSH (`vps-dragon@100.120.151.91`)
- `.env` del VPS en `/opt/opsly/.env`
- `CF_DNS_API_TOKEN` cargado en Doppler `ops-intcloudsysops/prd`
- `PLATFORM_DOMAIN=op-sly.com` en Doppler `ops-intcloudsysops/prd`
- `TENANT_BASE_DOMAIN=smiletripcare.com` en Doppler `ops-intcloudsysops/prd` (si quieres mantener dominios de cliente)

## Importante (evita fallos comunes)

- DNS publico debe apuntar a la IP publica del VPS (actual: `157.245.223.7`), no a Tailscale `100.x`.
- Si Cloudflare esta en modo proxied (nube naranja), `dig` no devolvera la IP del VPS sino IPs anycast de Cloudflare.
- `app.op-sly.com` no existe en Traefik hoy; el frontend cliente actual es `portal.op-sly.com`.

## 1) Vercel + Cloudflare (pasos manuales dashboard)

1. En Vercel > Domains, ubica `op-sly.com`.
2. En Cloudflare, agrega zona `op-sly.com` (plan free) y activa setup.
3. Cambia nameservers en el registrador a los que Cloudflare te entregue para esa zona.
4. Crea registros DNS recomendados (todos proxied):
   - `A @ -> 157.245.223.7`
   - `A api -> 157.245.223.7`
   - `A admin -> 157.245.223.7`
   - `A portal -> 157.245.223.7`
   - `A mcp -> 157.245.223.7`
   - `A traefik -> 157.245.223.7` (solo si expones dashboard)
   - `A * -> 157.245.223.7` (opcional; revisar impacto)

## 2) Doppler (config `prd`)

Validar secretos sin exponer valores:

```bash
doppler secrets get CF_DNS_API_TOKEN --project ops-intcloudsysops --config prd --plain | wc -c
doppler secrets get PLATFORM_DOMAIN --project ops-intcloudsysops --config prd --plain
```

Esperado:

- `CF_DNS_API_TOKEN` longitud > 0
- `PLATFORM_DOMAIN` exactamente `op-sly.com`
- `TENANT_BASE_DOMAIN` igual a `smiletripcare.com` (opcional, recomendado para separar marca cliente)

## 3) Aplicar en VPS

Desde repo local:

```bash
scripts/infra/domain-cutover-op-sly.sh --domain op-sly.com --apply-traefik-recreate --yes
```

El script:

- valida Doppler `CF_DNS_API_TOKEN` y `PLATFORM_DOMAIN`
- inspecciona DNS base/subdominios
- verifica `/opt/opsly/.env` remoto (sin mostrar token)
- recrea Traefik (opcional)
- valida HTTPS en `api` y `admin`

## 4) Verificacion final

```bash
curl -fsS https://api.op-sly.com/api/health
curl -I https://admin.op-sly.com
curl -I https://portal.op-sly.com/login
```

Revisar logs Traefik:

```bash
ssh vps-dragon@100.120.151.91 \
  "cd /opt/opsly/infra && docker compose --env-file /opt/opsly/.env -f docker-compose.platform.yml logs --tail=200 traefik"
```

Buscar eventos ACME/certificados emitidos para `*.op-sly.com` y hosts usados.

## 5) Seguridad Cloudflare recomendada

- SSL/TLS mode: Full (strict)
- Always Use HTTPS: ON
- WAF managed rules: ON
- Bot fight mode: ON (si no rompe flujos)
- DNSSEC: ON despues de estabilizar DNS

## 6) Cache rules sugeridas

- `api.op-sly.com/*`: bypass cache
- `admin.op-sly.com/*`: bypass cache
- `portal.op-sly.com/_next/static/*`: cache allowed
- Evitar `Cache Everything` global sobre API.

