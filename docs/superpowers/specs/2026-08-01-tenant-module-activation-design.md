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

**Corrección tras investigar el código real (reemplaza el diseño inicial basado en `AutoDeployWorker`):** `apps/api` ya ejecuta `docker compose` directamente vía `execa` en `lib/docker/container.ts` (`startTenant`/`stopTenant`), sin SSH — porque `apps/api` corre en producción directamente en el VPS (`/opt/opsly`). El patrón de provisioning completo de un tenant nuevo (`lib/orchestrator.ts` → `provisionTenant()`) ya hace exactamente lo que necesitamos: dispara el trabajo pesado como una promesa no esperada (`fire-and-forget`) desde el handler HTTP, y el estado se consulta después por polling. No hace falta BullMQ, ni `apps/orchestrator`, ni SSH — sería infraestructura nueva y redundante para replicar algo que ya existe en `apps/api`.

```
apps/admin (UI)
  → POST /api/tenants/[slug]/modules/[moduleId]/activate  (apps/api)
      → valida catálogo + dependencias (`requires`)
      → upsert en tenant_modules (status='queued')
      → dispara runModuleProvisioning(...) SIN await (fire-and-forget, igual que provisionTenant())
      → responde de inmediato { status: 'queued' }
      ↓ (en background, dentro del mismo proceso de apps/api)
runModuleProvisioning()
      → marca status='provisioning'
      → execa(bootstrap_script) con cwd=resolveOpslyRepoRoot(), timeout=estimated_setup_minutes*2 min
      → execa(smoke_script) si existe
      → status final: 'active' | 'active_needs_manual_steps' | 'failed'
      ↓
apps/admin (UI) — polling SWR (5s mientras queued/provisioning, 30s si settled)
```

`bootstrap_script` ya orquesta sus propios pasos de Doppler internamente (confirmado leyendo `scripts/tenants/bootstrap-twenty.sh`: fases secretos → doppler flags → compose → verify) — `apps/api` no necesita tocar Doppler por separado.

## Modelo de datos

Nueva tabla `platform.tenant_modules` — archivo directo en `supabase/migrations/0093_tenant_modules.sql` (siguiente número tras `0092_peskids_change_request_intake.sql`; no existe un script `migrations:create` real en el repo hoy, las migraciones son archivos SQL numerados a mano), mismo estilo que `0089_peskids_aging_alert_deliveries.sql`:

```sql
BEGIN;

CREATE TABLE IF NOT EXISTS platform.tenant_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL REFERENCES platform.tenants (slug) ON DELETE CASCADE,
  module_id text NOT NULL,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'provisioning', 'active', 'active_needs_manual_steps', 'failed', 'disabled')),
  last_error text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tenant_modules_tenant_module_unique UNIQUE (tenant_slug, module_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_modules_tenant
  ON platform.tenant_modules (tenant_slug);

ALTER TABLE platform.tenant_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_tenant_modules" ON platform.tenant_modules;
CREATE POLICY "service_role_all_tenant_modules"
  ON platform.tenant_modules
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON platform.tenant_modules TO service_role;

COMMIT;
```

`module_id` no tiene FK — el catálogo vive en JSON (`config/tenant-modules-catalog.json`), no en tabla. `tenant_slug` (no `tenant_id`) porque las rutas de la API y los scripts (`--tenant ${slug}`) ya trabajan por slug, evitando un join extra.

## API — `apps/api`

- `GET /api/tenants/[slug]/modules` — combina el catálogo completo con el estado actual (`tenant_modules`); un módulo sin fila devuelve `status: 'not_installed'`.
- `POST /api/tenants/[slug]/modules/[moduleId]/activate` — valida que los `requires` del módulo estén en `active` o `active_needs_manual_steps` para ese tenant; si falta alguno, `409` con la lista de dependencias faltantes. Si OK: upsert a `status='queued'`, dispara `runModuleProvisioning()` sin `await`, responde `{ status: 'queued' }` de inmediato.
- `POST /api/tenants/[slug]/modules/[moduleId]/deactivate` — v1: marca `status='disabled'` y devuelve los `manual_steps` de baja del catálogo (si existen) para que el operador los siga a mano. No ejecuta ningún script.
- `POST /api/tenants/[slug]/modules/[moduleId]/mark-manual-steps-done` — pasa de `active_needs_manual_steps` a `active`.

Todas siguen el estándar del repo: `requireAdminAccess()`, Zod, lógica en `lib/services/tenant-modules.service.ts`, errores con `request_id` vía `jsonError()`.

## Ejecución en background — `apps/api/lib/tenant-modules/provisioning.ts`

Función `runModuleProvisioning(tenantSlug, moduleId)`, llamada sin `await` desde el handler de `activate` (mismo patrón que `provisionTenant()` en `lib/orchestrator.ts`):
1. Resuelve la definición del módulo desde `tenant-modules-catalog.json` (`bootstrap_script`, `smoke_script`, `manual_steps`, `estimated_setup_minutes`).
2. Marca `tenant_modules.status='provisioning'`.
3. `execa` corre el `bootstrap_script` (parseado en comando + args) con `cwd: resolveOpslyRepoRoot()` (reusa el helper existente de `apps/api/lib/tools-execute.ts`) y `timeout: estimated_setup_minutes * 2 * 60_000`.
4. Si el bootstrap fue OK y el módulo tiene `smoke_script`, lo corre también.
5. Status final: `active_needs_manual_steps` si el módulo tiene `manual_steps`, si no `active`. En cualquier fallo de los pasos 3-4: `status='failed'`, `last_error` = últimas líneas de `stderr` (capturadas del `ExecaError`).

## UI — `apps/admin/app/tenants/[slug]/page.tsx`

- Nueva card "Módulos" debajo del `ContainerStatusGrid` existente. Lista los módulos del catálogo con badge de estado (`not_installed` / `queued` / `provisioning` / `active` / `active_needs_manual_steps` / `failed` / `disabled`).
- Botón "Activar" por módulo: deshabilitado con tooltip si faltan `requires`; abre modal de confirmación mostrando `estimated_setup_minutes`, `cost_level` y `manual_steps` antes de encolar (cumple la regla de confirmación para acciones tipo "prod deploy" del CLAUDE.md — no se ejecuta nada sin confirmación explícita del operador).
- Estado `active_needs_manual_steps`: checklist con los `manual_steps` del catálogo y botón "Marcar completado" → `POST mark-manual-steps-done`.
- Estado `failed`: muestra `last_error` (truncado) y botón "Reintentar" → vuelve a llamar `activate`.
- Hook nuevo `useTenantModules(slug)` (mismo patrón SWR que `useTenant`), `refreshInterval` dinámico: 5s si algún módulo está en `queued`/`provisioning`, 30s si todos están en estado terminal.

## Manejo de errores

- Fallo del `bootstrap_script` o `smoke_script` (timeout, exit code ≠ 0) → `status='failed'`, `last_error` con el tail de `stderr` capturado del `ExecaError` (nunca se expone el comando completo ni secretos al cliente HTTP — solo al log del servidor).
- `GET /api/tenants/[slug]/modules` nunca falla por falta de filas: módulo sin registro = `not_installed`, comportamiento por defecto sin necesitar seed.
- Reintentar un módulo `failed` es seguro asumiendo que los scripts en `scripts/tenants/` son idempotentes (ya es el caso para `bootstrap-twenty.sh` y `bootstrap-wacrm.sh`; verificar en el plan de implementación si aplica a los demás antes de exponer el botón "Reintentar" para ellos).
- Si `runModuleProvisioning()` lanza una excepción no prevista (fuera del try/catch de los pasos 3-4), un `catch` de nivel superior debe igualmente marcar `status='failed'` — nunca dejar una fila colgada en `provisioning` para siempre (mismo cuidado que `provisionTenant()` tiene con su `.catch()` final).

## Testing

- `apps/api/lib/tenant-modules/__tests__/provisioning.test.ts`: mockea `execa`, casos éxito simple (`active`), éxito con `manual_steps` (`active_needs_manual_steps`), fallo de bootstrap, fallo de smoke_script.
- `apps/api/app/api/tenants/[slug]/modules/__tests__/route.test.ts`: mocks de sesión + servicio, casos 200/400/403/409, siguiendo `tenants-route.test.ts` y `tenant-id-route.test.ts`.
- UI: opcional (regla del CLAUDE.md — testing de UI de apps es opcional, solo `lib/` es obligatorio).

## Siguientes sub-proyectos (no en este alcance)

1. CMS de contenido para `apps/icso/content/commercial-catalog.json`.
2. Revisión del admin operativo de `apps/peskids/app/admin` (ya existe CRUD; evaluar qué falta).
