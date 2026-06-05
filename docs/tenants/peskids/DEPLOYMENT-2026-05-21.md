---
status: active
owner: operations
last_review: 2026-05-26
tenant_slug: peskids
---

# Peskids — despliegue producción MVP (2026-05-21)

Registro operativo del cierre **Sprint 02** en API Opsly (`api.op-sly.com`). Complementa [SPRINT-02-RUN.md](./SPRINT-02-RUN.md).

## Resumen

| Ítem | Resultado |
|------|-----------|
| Código en `main` | PR [#374](https://github.com/cloudsysops/opsly/pull/374) → `9b538a81` |
| Migración `0053` | Aplicada en Supabase prod (`db push --dry-run`: *up to date*) |
| API en VPS | Imagen local `intcloudsysops-api:peskids-latest` (build en host) |
| Smoke MVP | PASS (2026-05-21 ~22:30 UTC) |
| Owner sign-off | Pendiente (`sierrasantiago90@gmail.com`) |

## Update 2026-05-26

- El VPS fue reconstruido con el `apps/api/Dockerfile` actualizado.
- El `npm ci` del build del API ahora ve el grafo completo de workspaces y compila sin el bloqueo del lockfile.
- Smoke de producción revalidado el `2026-05-26`:
  - `https://peskids.op-sly.com` responde.
  - `https://api.op-sly.com/api/health` responde `200`.
  - `https://api.op-sly.com/api/portal/health?slug=peskids` devuelve `n8n-peskids.op-sly.com` y `uptime-peskids.op-sly.com`.
  - `POST /api/public/tenants/peskids/leads` y `POST /api/public/tenants/peskids/feedback` siguen respondiendo `201`.

## Contexto: por qué no bastó `docker pull` GHCR

1. Workflow **Deploy** en `main` falla en `release-gate` (`npm ci` / lockfile; ver run `26247950024`).
2. La imagen `ghcr.io/cloudsysops/intcloudsysops-api:latest` en el VPS **no incluía** rutas `public/tenants/peskids/*` (solo `public/tenants/status`).
3. El repo en `/opt/opsly` sí tenía el código (`main` @ `9b538a81`) tras `git pull`.

**Mitigación aplicada:** build de API en el VPS desde el monorepo y recreación de `app` con esa imagen.

**Estado actual:** el VPS ya quedó actualizado con el build corregido y el monitoreo público de Peskids apunta a `n8n-peskids.op-sly.com` + `uptime-peskids.op-sly.com`.

## Pasos ejecutados (VPS)

Host: Tailscale `100.120.151.91`, usuario `vps-dragon`, ruta `/opt/opsly`.

```bash
# 1. Git alineado con main
cd /opt/opsly
git stash push -m "vps-pre-pull-YYYYMMDD" -- AGENTS.md   # si había cambios locales
git pull --ff-only origin main
# HEAD esperado: 9b538a81 (feat peskids Sprint 01+02)

# 2. Build imagen API (15–25 min; requiere ~4–8 GB disco libre)
PLATFORM_DOMAIN=$(grep -m1 '^PLATFORM_DOMAIN=' .env | cut -d= -f2- | tr -d '\r')
docker build -f apps/api/Dockerfile \
  --build-arg "PLATFORM_DOMAIN=${PLATFORM_DOMAIN}" \
  --build-arg "NEXT_PUBLIC_ADMIN_URL=https://admin.${PLATFORM_DOMAIN}" \
  -t intcloudsysops-api:peskids-$(date +%Y%m%d) \
  -t intcloudsysops-api:peskids-latest \
  .

# 3. Recrear servicio app (sin tocar admin/portal)
cd /opt/opsly/infra
APP_IMAGE=intcloudsysops-api:peskids-latest \
  docker compose -f docker-compose.platform.yml --env-file /opt/opsly/.env \
  up -d --no-deps --force-recreate app
```

Verificación en contenedor:

```bash
docker exec infra-app-1 find /app/apps/api/.next/server/app/api/public/tenants/peskids -name route.js
# → leads/route.js, feedback/route.js
```

## Smoke producción

Desde Mac o VPS (sin secretos en salida):

```bash
API_BASE=https://api.op-sly.com ./scripts/peskids-mvp-smoke.sh
```

Resultado **2026-05-21**:

| Prueba | HTTP | Notas |
|--------|------|--------|
| `GET /api/health` | 200 | Supabase + Redis OK |
| `POST .../peskids/leads` | 201 | `lead_id` en `platform.peskids_leads` |
| `POST .../peskids/feedback` (rating 2) | 201 | `needs_attention: true` |
| `GET /peskids/lead-form.html` | 200 | |
| `GET /peskids/feedback-form.html` | 200 | |

## URLs públicas

| Recurso | URL |
|---------|-----|
| Lead form | https://api.op-sly.com/peskids/lead-form.html |
| Feedback form | https://api.op-sly.com/peskids/feedback-form.html |
| API lead | `POST https://api.op-sly.com/api/public/tenants/peskids/leads` |
| API feedback | `POST https://api.op-sly.com/api/public/tenants/peskids/feedback` |
| Owner summary (JWT) | `GET https://api.op-sly.com/api/portal/tenant/peskids/peskids/summary` |
| n8n | https://n8n-peskids.op-sly.com |
| Uptime | https://uptime-peskids.op-sly.com |

## GHCR / Doppler (referencia)

- Secretos `GHCR_TOKEN` y `GHCR_USER` existen en Doppler `prd`; el PAT `ghp_*` previo devolvía **403** en `docker pull` (sin `read:packages` efectivo).
- Mitigación temporal documentada en operación VPS: token OAuth vía `gh auth token` en Doppler, o login con `GITHUB_TOKEN` del job **Deploy** cuando CI esté verde.
- No volcar tokens en chat ni en commits. Rotar si hubo exposición en logs CLI.

## Persistir imagen entre reinicios

Hasta que CI publique una imagen GHCR con rutas Peskids, fijar en Doppler `prd` (y regenerar `.env` del VPS con bootstrap):

```bash
# Valor orientativo (no secret):
APP_IMAGE=intcloudsysops-api:peskids-latest
```

O documentar en `/opt/opsly/.env` y evitar que `watchtower` o `pull` de `:latest` GHCR reemplace la imagen local sin revisión.

## Pendiente

- [ ] Owner: demo + validación portal summary ([DEMO-SCRIPT.md](./DEMO-SCRIPT.md))
- [ ] Reparar CI Deploy (`npm ci` en `release-gate`) y volver a flujo GHCR estándar
- [ ] Fase 3: estabilización webhook Jelou ([WHATSAPP-CHANNEL.md](./WHATSAPP-CHANNEL.md))
- [ ] Opcional: PR docs [#377](https://github.com/cloudsysops/opsly/pull/377) (`claude/add-claude-documentation-0kWXf`) — no bloquea runtime MVP

## Relación con ramas / agentes

| Rama / PR | Rol |
|-----------|-----|
| `main` @ `9b538a81` | Runtime MVP mergeado (#374) |
| `feat/peskids-sprint-01` | Commits adicionales locales (agent packs, Docker peskids) — no requeridos para este deploy |
| `claude/add-claude-documentation-0kWXf` | Docs sesión Claude (#377); independiente del deploy API |

## Rollback (solo si falla tras deploy)

```bash
cd /opt/opsly/infra
APP_IMAGE=ghcr.io/cloudsysops/intcloudsysops-api:latest \
  docker compose -f docker-compose.platform.yml --env-file /opt/opsly/.env \
  up -d --no-deps --force-recreate app
```

Nota: la imagen GHCR `:latest` **no** expone rutas Peskids hasta nuevo build en CI.

---

## Enlaces relacionados

- [[tenants/peskids/README|peskids]]
- [[brain/README|Brain Central]]
