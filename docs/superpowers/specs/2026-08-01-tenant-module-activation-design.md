---
status: approved
owner: operations
last_review: 2026-08-01
tenant_slug: n/a
---

# Activación de módulos por tenant en apps/admin (sub-proyecto 1 de 3)

**Contexto:** Opsly ya tiene el catálogo comercial organizado por módulos (`config/tenant-modules-catalog.json`: twenty, wacrm, n8n, llm, uptime + bundles starter/growth/ai-first) desde PRs #868 y #873, y `apps/icso` ya vende por módulo (`/modules/[id]`, `/quote`). Pero no existe ninguna UI que administre qué módulos tiene activos un tenant — `apps/admin/app/tenants/[slug]/page.tsx` solo muestra contenedores y status del stack, y la tabla `tenants` no tiene ningún campo de módulos. Hoy la activación de un módulo (ej. Twenty CRM para un tenant nuevo) se hace corriendo scripts manualmente (`scripts/tenants/bootstrap-twenty.sh --tenant ${slug}`).

Este es el primero de tres sub-proyectos identificados a partir de un pedido más amplio ("CMS para administrar Peskids/tenants por módulos"):
1. **Este documento** — activación de módulos por tenant en `apps/admin`.
2. CMS de contenido para `apps/icso/content/commercial-catalog.json` (diseño aparte).
3. Revisión/extensión del admin operativo ya existente en `apps/peskids/app/admin` (diseño aparte).

## Alcance

Dar al operador (founder solo, sin equipo) un panel en `apps/admin` para:
- Ver qué módulos del catálogo tiene activos/pendientes/fallidos cada tenant.
- Activar un módulo con un clic: el sistema ejecuta el `bootstrap_script` + `smoke_script` del catálogo sobre el VPS, sin que el operador tenga que correr scripts a mano por SSH.
- Ver claramente cuándo un módulo requiere pasos manuales post-activación (`manual_steps` del catálogo) y marcarlos como completados.

Fuera de alcance:
- Desinstalación automática de un módulo (el catálogo no define scripts de baja hoy; v1 solo marca `disabled` y muestra los pasos manuales de baja).
- Edición del catálogo (`tenant-modules-catalog.json`) desde UI — se sigue editando a mano, es infraestructura, no contenido comercial.
- Cualquier cambio a `apps/icso` o `apps/peskids/app/admin` (sub-proyectos 2 y 3).

## Arquitectura

```
apps/admin (UI)
  → POST /api/tenants/[slug]/modules/[moduleId]/activate  (apps/api)
      → valida catálogo + dependencias (`requires`)
      → upsert en tenant_modules (status='queued')
      → encola BullMQ job en cola 'openclaw', job.name='module-provision'
      ↓
apps/orchestrator — ModuleProvisionWorker
      → SSH a vps-dragon@100.120.151.91 (mismo patrón que AutoDeployWorker.ts)
      → corre bootstrap_script del módulo
      → corre smoke_script
      → activa doppler_flag vía wrapper de Doppler (nunca imprime secretos)
      → escribe status final en tenant_modules + notifica Discord
      ↓
apps/admin (UI) — polling SWR (5s mientras queued/provisioning, 30s si settled)
```

Reutiliza el esqueleto de `apps/orchestrator/src/workers/AutoDeployWorker.ts` (SSH vía `execFile`, timeouts, `notifyDiscord`) — solo cambia el comando ejecutado y la tabla actualizada. No se introduce infraestructura nueva (sin colas nuevas, sin servicios nuevos).

## Modelo de datos

Nueva tabla Supabase `tenant_modules`, migración vía `npm run migrations:create --workspace=@intcloudsysops/migrations`:

```sql
CREATE TABLE IF NOT EXISTS public.tenant_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  module_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'provisioning', 'active', 'active_needs_manual_steps', 'failed', 'disabled')),
  last_error TEXT,
  job_id TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, module_id)
);
```

`module_id` no tiene FK — el catálogo vive en JSON (`config/tenant-modules-catalog.json`), no en tabla. RLS: solo `service_role` lee/escribe (admin y orchestrator usan la service key); no hay acceso desde sesiones de tenant/portal.

## API — `apps/api`

- `GET /api/tenants/[slug]/modules` — combina el catálogo completo con el estado actual (`tenant_modules`); un módulo sin fila devuelve `status: 'not_installed'`.
- `POST /api/tenants/[slug]/modules/[moduleId]/activate` — valida que los `requires` del módulo estén en `active` o `active_needs_manual_steps` para ese tenant; si falta alguno, `409` con la lista de dependencias faltantes. Si OK: upsert a `status='queued'`, encola el job, devuelve `{ job_id, status: 'queued' }`.
- `POST /api/tenants/[slug]/modules/[moduleId]/deactivate` — v1: marca `status='disabled'` y devuelve los `manual_steps` de baja del catálogo (si existen) para que el operador los siga a mano. No ejecuta ningún script.
- `POST /api/tenants/[slug]/modules/[moduleId]/mark-manual-steps-done` — pasa de `active_needs_manual_steps` a `active`.

Todas siguen el estándar del repo: `requireAdmin()`, Zod en `lib/validation/tenant-modules.schema.ts`, lógica en `lib/services/tenant-modules.service.ts`, errores con `request_id` vía `jsonError()`/`jsonBadRequest()`.

## Worker — `apps/orchestrator/src/workers/ModuleProvisionWorker.ts`

Mismo esqueleto que `AutoDeployWorker`:
1. Lee `job.data.tenantSlug` + `moduleId`.
2. Resuelve la definición del módulo desde `tenant-modules-catalog.json` (`bootstrap_script`, `smoke_script`, `doppler_flag`, `manual_steps`, `estimated_setup_minutes`).
3. Marca `tenant_modules.status='provisioning'`.
4. SSH (`runSSH`, igual que en `AutoDeployWorker`) corre el `bootstrap_script` con timeout = `estimated_setup_minutes * 2` minutos.
5. Si el bootstrap fue OK, corre `smoke_script` (si existe).
6. Si `smoke_script` no existe o pasó: activa `doppler_flag` (si existe) vía wrapper Doppler existente.
7. Status final: `active_needs_manual_steps` si el módulo tiene `manual_steps`, si no `active`. En cualquier fallo de los pasos 4-6: `status='failed'`, `last_error` = últimas líneas de stderr.
8. `notifyDiscord()` en éxito y en fallo (reusa la función ya existente en `NotifyWorker.ts`).

## UI — `apps/admin/app/tenants/[slug]/page.tsx`

- Nueva card "Módulos" debajo del `ContainerStatusGrid` existente. Lista los módulos del catálogo con badge de estado (`not_installed` / `queued` / `provisioning` / `active` / `active_needs_manual_steps` / `failed` / `disabled`).
- Botón "Activar" por módulo: deshabilitado con tooltip si faltan `requires`; abre modal de confirmación mostrando `estimated_setup_minutes`, `cost_level` y `manual_steps` antes de encolar (cumple la regla de confirmación para acciones tipo "prod deploy" del CLAUDE.md — no se ejecuta nada sin confirmación explícita del operador).
- Estado `active_needs_manual_steps`: checklist con los `manual_steps` del catálogo y botón "Marcar completado" → `POST mark-manual-steps-done`.
- Estado `failed`: muestra `last_error` (truncado) y botón "Reintentar" → vuelve a llamar `activate`.
- Hook nuevo `useTenantModules(slug)` (mismo patrón SWR que `useTenant`), `refreshInterval` dinámico: 5s si algún módulo está en `queued`/`provisioning`, 30s si todos están en estado terminal.

## Manejo de errores

- Fallo de SSH o de cualquiera de los scripts → `status='failed'`, `last_error` con el tail de stderr (nunca se expone el comando completo con secretos al cliente — solo al log del orchestrator).
- `GET /api/tenants/[slug]/modules` nunca falla por falta de filas: módulo sin registro = `not_installed`, comportamiento por defecto sin necesitar seed.
- Reintentar un módulo `failed` es seguro asumiendo que los scripts en `scripts/tenants/` son idempotentes (ya es el caso para `bootstrap-twenty.sh` y `bootstrap-wacrm.sh`, verificar en el plan de implementación si aplica a los demás).

## Testing

- `apps/orchestrator/src/__tests__/module-provision-worker.test.ts`: mock de SSH (mismo patrón que `worker-concurrency.test.ts`), casos éxito/fallo/manual_steps.
- `apps/api/app/api/tenants/[slug]/modules/__tests__/route.test.ts`: mocks de sesión + servicio, casos 200/400/403/409, siguiendo `tenants-route.test.ts`.
- UI: opcional (regla del CLAUDE.md — testing de UI de apps es opcional, solo `lib/` es obligatorio).

## Siguientes sub-proyectos (no en este alcance)

2. CMS de contenido para `apps/icso/content/commercial-catalog.json`.
3. Revisión del admin operativo de `apps/peskids/app/admin` (ya existe CRUD; evaluar qué falta).
