---
status: active
owner: operations
last_review: 2026-07-26
tenant_slug: peskids
---

# Peskids — dominio propio (`www.peskids.com`)

## Canónico

- **URL pública:** `https://www.peskids.com`
- **Apex** `https://peskids.com` → 301 a `www`
- **Legacy** `https://peskids.op-sly.com` → 301 a `www` (transición)
- **Herramientas** (n8n / uptime / CRM) siguen en `*.op-sly.com` en esta fase

## DNS Cloudflare (zona `peskids.com`)

| Tipo | Nombre | Contenido | Proxy |
|------|--------|-----------|-------|
| A | `peskids.com` | `157.245.223.7` | ON (naranja) |
| CNAME | `www` | `peskids.com` | ON (naranja) |

SSL/TLS del dominio: **Full** o **Full (Strict)** (no Flexible).

## Traefik

Archivo: [`infra/traefik/dynamic/peskids.yml`](../../../infra/traefik/dynamic/peskids.yml)

- Router `www.peskids.com` → servicio `peskids:3004`
- Middleware `peskids-to-www` para apex + legacy
- Certificados Let's Encrypt vía `dnsChallenge` Cloudflare (`CF_DNS_API_TOKEN` en Doppler `prd`)

Tras merge en `main` en el VPS:

```bash
cd /opt/opsly && git pull --ff-only origin main
# Traefik file provider hace hot-reload del YAML; si no,:
docker compose --env-file /opt/opsly/.env -f infra/docker-compose.platform.yml up -d --force-recreate traefik
```

## App / Doppler

| Variable | Valor |
|----------|--------|
| `NEXT_PUBLIC_PESKIDS_SITE_URL` | `https://www.peskids.com` |
| `PESKIDS_SITE_URL` | `https://www.peskids.com` |
| `PESKIDS_PUBLIC_URL` | `https://www.peskids.com` |

Build-arg en [`.github/workflows/deploy-peskids.yml`](../../../.github/workflows/deploy-peskids.yml).

## Supabase Auth (manual checklist)

En el proyecto Supabase de Peskids, añadir a **Redirect URLs** / Site URL:

- Site URL: `https://www.peskids.com`
- Redirect allowlist: `https://www.peskids.com/**`, `https://www.peskids.com/auth/callback`

Mantener temporalmente `https://peskids.op-sly.com/**` hasta cerrar la transición.

## Smoke

```bash
curl -sI https://peskids.com | head -5          # Location: https://www.peskids.com/
curl -sf https://www.peskids.com/api/health      # {"status":"ok",...}
curl -sI https://peskids.op-sly.com | head -5    # redirect a www
```

## Enlaces relacionados

- [[tenants/peskids/CLOUDFLARE-TRAEFIK-NOTES|CLOUDFLARE-TRAEFIK-NOTES]]
- [[tenants/peskids/EXTRACTION-PLAN|EXTRACTION-PLAN]]
