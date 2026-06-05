# Cloudflare ↔ Traefik Routing Notes

## Issue

API routes work perfectly internally (Docker network, direct VPS curl), but requests coming through Cloudflare to `api.op-sly.com` return 404 for:

- `POST /api/public/tenants/peskids/webhooks/gohighlevel/leads`
- `GET /api/admin/peskids/[slug]/executive`

The legacy domain `api.ops.smiletripcare.com` **works** externally.

## Root Cause

**Traefik router rules use `${PLATFORM_DOMAIN}` interpolation.**  

The `app` service router label was:

```
traefik.http.routers.app.rule=Host(`api.${PLATFORM_DOMAIN}`)
```

On the VPS, `PLATFORM_DOMAIN` is still set to `ops.smiletripcare.com` (the old domain).  
Therefore the rule resolves to `Host(api.ops.smiletripcare.com)`, and `api.op-sly.com` does **not** match any Traefik router → 404.

## Fix Applied (2026-06-03)

**File:** `infra/docker-compose.platform.yml`

Added explicit `|| Host(<domain>.op-sly.com)` fallback to all Traefik router rules so they match **both** the old domain (via `${PLATFORM_DOMAIN}`) and the new domain (via hardcoded `op-sly.com`):

| Service | Old Rule | New Rule |
|---|---|---|
| `app` | `Host(\`api.\${PLATFORM_DOMAIN}\`)` | `Host(\`api.\${PLATFORM_DOMAIN}\`) \|\| Host(\`api.op-sly.com\`)` |
| `opsly-admin` | `Host(\`admin.\${PLATFORM_DOMAIN}\`)` | `Host(\`admin.\${PLATFORM_DOMAIN}\`) \|\| Host(\`admin.op-sly.com\`)` |
| `portal` | `Host(\`portal.\${PLATFORM_DOMAIN}\`) \|\| Host(\`app.\${PLATFORM_DOMAIN}\`) \|\| Host(\`\${PLATFORM_DOMAIN}\`)` | + `\|\| Host(\`portal.op-sly.com\`) \|\| Host(\`op-sly.com\`)` |
| `mcp` | `Host(\`mcp.\${PLATFORM_DOMAIN}\`)` | `Host(\`mcp.\${PLATFORM_DOMAIN}\`) \|\| Host(\`mcp.op-sly.com\`)` |
| `grafana` | `Host(\`grafana.\${PLATFORM_DOMAIN}\`)` | `Host(\`grafana.\${PLATFORM_DOMAIN}\`) \|\| Host(\`grafana.op-sly.com\`)` |
| `traefik-dashboard` | `Host(\`traefik.\${PLATFORM_DOMAIN}\`)` | `Host(\`traefik.\${PLATFORM_DOMAIN}\`) \|\| Host(\`traefik.op-sly.com\`)` |

## How to Verify

After redeploying Traefik (`docker compose up -d traefik`):

```bash
# 1. Health endpoint (new domain)
curl -sfk https://api.op-sly.com/api/health
# Expected: {"status":"ok","timestamp":"...","version":"...","checks":{...}}

# 2. Peskids executive endpoint
curl -sfk https://api.op-sly.com/api/admin/peskids/peskids/executive
# Expected: 200 with data

# 3. Legacy domain still works
curl -sfk https://api.ops.smiletripcare.com/api/health
# Expected: 200

# 4. Internal / Docker network (already working)
docker exec infra-app-1 sh -c "curl -sf http://127.0.0.1:3000/api/health"
# Expected: 200
```

## Cloudflare SSL/TLS Settings

Cloudflare must use **Full** or **Full (Strict)** SSL/TLS encryption mode:
- **Not Flexible** — Traefik listens on port 443 (`websecure` entrypoint), not 80
- Flexible would make Cloudflare connect to the VPS over HTTP on port 80, triggering Traefik's HTTP→HTTPS redirect loop

Check in Cloudflare Dashboard → SSL/TLS → Overview:
- Set to **Full** (recommended) or **Full (Strict)**

## Permanent Fix (When Old Domain Is Retired)

When `ops.smiletripcare.com` is fully decommissioned:

1. Update `PLATFORM_DOMAIN` to `op-sly.com` in Doppler `prd` config
2. Re-run `./scripts/vps-bootstrap.sh` on the VPS to regenerate `/opt/opsly/.env`
3. Redeploy: `docker compose up -d traefik app admin portal`

The `|| Host(...op-sly.com)` fallbacks can then be removed (they'd be redundant with `${PLATFORM_DOMAIN}`).
