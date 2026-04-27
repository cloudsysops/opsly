# Plan de trabajo — Orchestrator (VPS) + Worker (Mac 2011)

Orden lógico. **No** requiere API keys nuevas para el worker (solo `REDIS_URL` alineada al control plane).

---

## Fase A — Imagen Orchestrator (bloqueante VPS)

**Problema resuelto en código:** la imagen anterior no incluía `@intcloudsysops/ml` → `MODULE_NOT_FOUND` en runtime.

| Paso | Dónde          | Acción                                                                                                                                                                  |
| ---- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1   | Repo           | `apps/orchestrator/Dockerfile` construye `types` → `ml` → `orchestrator` y el runner copia `node_modules` + `apps/ml` + `packages/types`.                               |
| A2   | Git            | Commit + push a `main` (solo este cambio o junto a release estable).                                                                                                    |
| A3   | GitHub Actions | Workflow que hace build/push de `ghcr.io/.../intcloudsysops-orchestrator` → **esperar run verde**.                                                                      |
| A4   | VPS            | `docker compose ... pull orchestrator` + `up -d --no-deps --force-recreate orchestrator` (ver `deploy.yml` / `infra/docker-compose.platform.yml` para nombres exactos). |
| A5   | VPS            | `docker logs opsly_orchestrator --tail 40` — sin `Cannot find module '@intcloudsysops/ml'`.                                                                             |

**No sustituye A2–A4:** ejecutar solo `npm ci` / `npm run build` en `/opt/opsly` en el host **no** actualiza el contenido del contenedor si usáis imagen GHCR.

---

## Fase B — Supabase (insights, si aún no aplicado)

| Paso | Acción                                                                                                             |
| ---- | ------------------------------------------------------------------------------------------------------------------ |
| B1   | Una sola migración canónica: `supabase/migrations/0030_tenant_insights.sql` (tabla con `summary`, `status`, etc.). |
| B2   | `npx supabase db push` o SQL Editor en el proyecto correcto.                                                       |

Detalle operativo: [`docs/RUNBOOK-INSIGHTS-DEPLOY.md`](RUNBOOK-INSIGHTS-DEPLOY.md).

---

## Fase C — SSH Mac 2011

| Paso | Acción                                                                                            |
| ---- | ------------------------------------------------------------------------------------------------- |
| C1   | Desde tu Mac: `ssh-copy-id -i ~/.ssh/id_ed25519.pub cboteros@100.80.41.29` (o la clave que uses). |
| C2   | Probar: `ssh cboteros@100.80.41.29 "hostname && uptime"`.                                         |

---

## Fase D — Worker remoto

| Paso | Acción                                                                                                                                                           |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1   | `REDIS_URL` **idéntica** a la del VPS (con password si aplica). Obtenerla solo desde Doppler o `.env` en sesión segura — no pegar en chat.                       |
| D2   | En `~/opsly`: `git pull`, crear/actualizar **`.env.worker`** (no commitear).                                                                                     |
| D3   | Arranque: `./scripts/start-workers-mac2011.sh` (script del repo; **no** sobrescribir con `npm run start:worker` a mano). Opcional: `tmux` sesión `opsly-worker`. |

Guía: [`docs/WORKER-SETUP-MAC2011.md`](WORKER-SETUP-MAC2011.md).

---

## Fase E — Verificación cruzada

```bash
# API
curl -sS https://api.${PLATFORM_DOMAIN}/api/health

# Orchestrator (VPS)
ssh vps-dragon@100.120.151.91 "docker ps --format '{{.Names}}\t{{.Status}}' | grep orchestrator"

# Worker (Mac 2011, tras C–D)
ssh cboteros@100.80.41.29 "tmux capture-pane -t opsly-worker -p 2>/dev/null | tail -15"
```

---

## Checklist rápido

- [ ] Fase A: imagen nueva desplegada, orchestrator estable
- [ ] Fase B: migración insights aplicada (si el producto insights está en scope)
- [ ] Fase C: SSH al Mac 2011 OK
- [ ] Fase D: `.env.worker` + worker corriendo
- [ ] Fase E: health + logs sin errores

---

_Última alineación: Dockerfile orchestrator + migración única `0030` para `tenant_insights`._
