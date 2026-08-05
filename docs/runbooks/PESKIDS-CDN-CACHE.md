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

## Síntoma

`https://www.peskids.com` muestra UI o copy **viejo** tras un deploy.

## Capas (en orden)

| Capa | Cómo se ve | Qué hacer |
|------|------------|-----------|
| 1. Cloudflare | Header `cf-cache-status: HIT` | Purgar zona `peskids.com` |
| 2. Next prerender | `x-nextjs-cache: HIT` + `s-maxage=31536000` | Redeploy imagen GHCR (el HTML está en el build) |
| 3. Browser | Solo en tu máquina | Hard refresh `Cmd+Shift+R` / ventana privada |
| 4. Código antiguo | `/api/health` → `git_sha` viejo | Deploy Peskids de un SHA más nuevo |

Comprobar origen real:

```bash
curl -fsS https://www.peskids.com/api/health | jq '{git_sha,image_tag}'
curl -fsSIL https://www.peskids.com/ | rg -i 'cf-cache|cache-control|x-nextjs'
```

## Purge Cloudflare (rápido)

```bash
./scripts/ops/purge-peskids-cdn.sh --dry-run
doppler run --project ops-intcloudsysops --config prd -- \
  ./scripts/ops/purge-peskids-cdn.sh
```

Requiere `CF_DNS_API_TOKEN` con **Cache Purge** en la zona `peskids.com`.

## Tras deploy

1. Confirmar `git_sha` en health = SHA desplegado.
2. `./scripts/ops/purge-peskids-cdn.sh`
3. Hard refresh.

La home usa `revalidate` corto + headers HTML (`s-maxage` bajo) para no clavar un año de CDN en la landing.

## Relacionado

- Deploy: `scripts/peskids-deploy-vps.sh`, `.github/workflows/deploy-peskids.yml`
- Dominio canónico: `https://www.peskids.com`

---

## Enlaces relacionados

- [[runbooks/README|runbooks]]
- [[tenants/peskids/DEPLOYMENT-STRATEGY|DEPLOYMENT-STRATEGY]]
