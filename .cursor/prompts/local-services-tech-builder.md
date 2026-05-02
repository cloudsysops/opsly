# Local Services — Tech builder (Week 1 Phase)

Canal de trabajo para Cursor Agent: **pegar este archivo con `@`** al iniciar la tarea o abrir un chat dedicado a Local Services.

## Fuente de verdad en repo

- Estado y bloqueantes: `AGENTS.md` (raíz)
- Aislamiento tenant: `apps/api/lib/tenant-context.ts` + `apps/api/lib/__tests__/tenant-context.test.ts`
- Patrones API portal/admin existentes: `apps/api/app/api/portal/tenant/[slug]/` (Zero-Trust)
- Sin secretos en git: Doppler `ops-intcloudsysops` / `prd`

## Alcance Week 1 (ejecutar en orden)

1. **Migración** `supabase/migrations/0046_local_services_core.sql`
   - 5 tablas en `platform.*` o `tenant` schema según decisión de arquitectura documentada en el PR (consistencia con `platform.tenants.slug` / FK).
   - **RLS** + políticas: acceso acotado por tenant (alineado a JWT `user_metadata.tenant_slug` donde aplique lectura portal; `service_role` para API con contexto explícito).
2. **API** bajo `apps/api/app/api/local-services/` (o bajo `portal/tenant/[slug]/` si la decisión es Zero-Trust como el resto del portal):
   - `services`, `customers`, `bookings`, `quotes`, `reports` (recursos REST coherentes con tablas).
   - Cada handler que toque datos tenant debe ejecutar lógica dentro de `runWithTenantContext` / `setTenantContext` tras resolver tenant de sesión (mismo patrón que definan los arquitectos en `tenant-context`).
3. **UI pública** `apps/local-services/app/book/page.tsx` (formulario de reserva; si el workspace no existe, crear app Next acotada o acordar ruta en `apps/portal`).
4. **Tests** de aislamiento tenant: Vitest en `apps/api` — dos tenants, verificar que slug A no lee/escribe datos de slug B.

## Checklist antes de PR

- `npm run type-check`
- `npm run test --workspace=@intcloudsysops/api` (o subset de tests tocados)
- `npm run validate-openapi` si se añaden rutas públicas documentadas
- Sin `any` nuevo; números mágicos en `lib/constants.ts` o constantes del módulo

## Mensaje corto para pegar en cada sesión

```
@AGENTS.md @apps/api/lib/tenant-context.ts @.cursor/prompts/local-services-tech-builder.md
Sprint Local Services Week 1: [migración 0046 | rutas API | form book | tests aislamiento].
Rama: cursor/local-services-week1-* — commit convencional al cerrar cada sub-tarea.
```
