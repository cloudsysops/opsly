# Triage — onboarding de tenants (API + orquestador)

Objetivo: en **menos de 15 minutos** localizar si el fallo es HTTP/API, fila BullMQ, Docker en VPS o Supabase.

## 1. API — creación síncrona (`POST /api/tenants`)

La ruta hace `provisionTenant` y luego **post-check** en `platform.tenants` antes de responder `202`.

Eventos de log útiles (JSON / logger):

| Evento                                                                 | Significado                                                                     |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `tenant.route.create.request`                                          | Entrada con `slug`, `owner_email`, `plan`.                                      |
| `tenant.route.create.accepted`                                         | Post-check OK; fila visible en DB.                                              |
| `tenant.route.post_check_not_found`                                    | Tras reintentos no aparece la fila → revisar insert/RLS/Supabase.               |
| `tenant.provisioning.insert.start` / `insert.done` / `insert.verified` | Insert y verificación en orquestador.                                           |
| `tenant.provisioning.pipeline.start`                                   | Inicio pipeline async (puertos, compose, health).                               |
| `tenant.provisioning.pipeline.failed`                                  | Fallo en pipeline; incluye `last_completed_step`, `tenant_id`, `slug`, `error`. |

Comandos típicos en VPS (logs del contenedor API):

```bash
docker logs infra-app-1 2>&1 | rg "tenant\.(route|provisioning)" | tail -n 80
```

## 2. Lista y estado en DB

Admin o API autenticada:

- `GET /api/tenants` — lista paginada (service role / admin según tu modo).

En Supabase SQL (solo operadores):

- `select id, slug, status, progress, created_at from platform.tenants where slug = '<slug>';`

## 3. Cola BullMQ / orchestrator

Si el tenant queda en `provisioning` largo tiempo:

- Redis en VPS: revisar conectividad y contraseña (`REDIS_URL`).
- Logs del servicio `orchestrator` / workers según `docs/ORCHESTRATOR.md` y `docs/WORKER-TESTING.md`.

## 4. Docker por tenant

Plantillas y comandos: `scripts/lib/docker-helpers.sh`, `scripts/onboard-tenant.sh`.

```bash
./scripts/opsly.sh ps-tenant <slug>
```

## 5. Checklist de salida

- [ ] `POST /api/tenants` → `202` y fila existe en `platform.tenants` (no “fantasma”).
- [ ] Logs muestran `tenant.route.create.accepted` o un error explícito (`500` con mensaje en logs).
- [ ] Si pipeline falla: `tenant.provisioning.pipeline.failed` con `last_completed_step` para acotar (puertos vs compose vs health vs email).

## 6. Script de smoke (API remota)

Con token admin (nunca en issues públicos):

```bash
export ADMIN_TOKEN="…"
export API_URL="https://api.<dominio>"
bash scripts/smoke-tenant-provision-api.sh --dry-run
SMOKE_ALLOW_PROD=1 bash scripts/smoke-tenant-provision-api.sh --cleanup
```

Requiere `jq` y `curl`. `--cleanup` hace `DELETE /api/tenants/<id>` al final.
