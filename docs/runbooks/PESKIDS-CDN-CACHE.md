---
status: canon
owner: operations
last_review: 2026-08-05
type: runbook
tags:
  - opsly/runbook
  - peskids
---

# Peskids — CDN / caché (Cloudflare + Next)

## Objetivo

Tras **cada** deploy/redeploy, la web pública (`https://www.peskids.com`) debe reflejar la imagen nueva sin quedarse en HTML/assets viejos.

## Post-deploy automático (tarea fija)

| Dónde | Qué corre |
|-------|-----------|
| `scripts/peskids-deploy-vps.sh` | Tras health local/público → `scripts/ops/purge-peskids-cdn.sh --soft` |
| `.github/workflows/deploy-peskids.yml` | Job `deploy-vps` → step **Post-deploy — purge Cloudflare CDN** |

`--soft`: si Cloudflare/API falla, el deploy **no** se marca fallido; queda warning en logs.

### Secret requerido en GitHub Actions

| Secret | Origen |
|--------|--------|
| `CF_DNS_API_TOKEN` | Doppler `ops-intcloudsysops` / `prd` (mismo token; permiso **Zone → Cache Purge** en `peskids.com`) |

Sin el secret en GitHub, el step del workflow avisa y hace skip. El script en VPS puede usar Doppler en el host.

```bash
# One-time: sync token to Actions (stdin — no pegar en chat)
doppler secrets get CF_DNS_API_TOKEN --project ops-intcloudsysops --config prd --plain \
  | gh secret set CF_DNS_API_TOKEN --repo cloudsysops/opsly
# Also production env if Deploy Peskids uses environment secrets:
doppler secrets get CF_DNS_API_TOKEN --project ops-intcloudsysops --config prd --plain \
  | gh secret set CF_DNS_API_TOKEN --repo cloudsysops/opsly --env production
```

## Capas si aún se ve “viejo”

| Capa | Cómo se ve | Qué hacer |
|------|------------|-----------|
| 1. Cloudflare | `cf-cache-status: HIT` | Purge (automático post-deploy; manual abajo) |
| 2. Next prerender | `x-nextjs-cache` + `s-maxage` largo | Redeploy imagen; home usa `revalidate=60` + headers cortos |
| 3. Browser | Solo en tu máquina | Hard refresh `Cmd+Shift+R` |
| 4. Código antiguo | `/api/health` → `git_sha` viejo | Deploy Peskids de un SHA más nuevo |

```bash
curl -fsS https://www.peskids.com/api/health | jq '{git_sha,image_tag}'
curl -fsSIL https://www.peskids.com/ | rg -i 'cf-cache|cache-control|x-nextjs'
```

## Purge manual

```bash
./scripts/ops/purge-peskids-cdn.sh --dry-run
doppler run --project ops-intcloudsysops --config prd -- \
  ./scripts/ops/purge-peskids-cdn.sh
```

## Relacionado

- Deploy VPS: `scripts/peskids-deploy-vps.sh`
- CI: `.github/workflows/deploy-peskids.yml`
- Dominio canónico: `https://www.peskids.com`

---

## Enlaces relacionados

- [[runbooks/README|runbooks]]
- [[tenants/peskids/DEPLOYMENT-STRATEGY|DEPLOYMENT-STRATEGY]]
