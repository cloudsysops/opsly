# Local Services — Tech builder (Week 1 Phase)

Canal de trabajo para Cursor Agent: **pegar este archivo con `@`** al iniciar la tarea o abrir un chat dedicado a Local Services.

## Trato: **tenant Opsly nuevo** (no “solo un microservicio”)

**Equipa** (marca) vive en el tenant **`local-services`**: **limpieza de equipos + upgrade** en campo, **oferta productiva** y **banco de pruebas de automatizaciones** (n8n, integraciones, flujos). Debe existir como cualquier otro tenant: `platform.tenants`, schema, stack estándar tras onboard, portal con `tenant_slug` en JWT, aislamiento estricto en API/DAL (`tenant-context`). Go-live: `docs/runbooks/LOCAL-SERVICES-GO-LIVE.md`.

- Config placeholder: `config/tenants/local-services.json`
- Contexto de negocio + piloto: `@.cursor/prompts/tenants/local-services/piloto-automatizaciones.md`

## Fuente de verdad en repo

- Estado y bloqueantes: `AGENTS.md` (raíz)
- Aislamiento tenant: `apps/api/lib/tenant-context.ts` + `apps/api/lib/__tests__/tenant-context.test.ts`
- Patrones API portal/admin existentes: `apps/api/app/api/portal/tenant/[slug]/` (Zero-Trust)
- Sin secretos en git: Doppler `ops-intcloudsysops` / `prd`

## Alcance Week 1 (estado en repo)

1. **Migración** `supabase/migrations/0046_local_services_core.sql` — 5 tablas `platform.ls_*` + FK `tenant_slug` → `tenants.slug` + RLS `service_role`.
2. **API** `apps/api/app/api/local-services/tenants/[slug]/*` (GET listas) con `runLocalServicesTenantDal` → `runWithTenantContext` (mismo patrón que `portal-tenant-dal`).
3. **Reserva pública** `POST /api/local-services/public/tenants/{slug}/bookings` (sin JWT; tenant `active`).
4. **App** `apps/local-services` — `npm run dev --workspace=@intcloudsysops/local-services` (puerto **3005**), formulario en `/book`. Env: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_LOCAL_SERVICES_TENANT_SLUG` (default `local-services`).
5. **Tests** Vitest: `lib/__tests__/local-services-dal.test.ts`, `app/api/local-services/public/.../route.test.ts`.

## Checklist antes de PR

- `npm run type-check`
- `npm run test --workspace=@intcloudsysops/api` (o subset de tests tocados)
- `npm run validate-openapi` si se añaden rutas públicas documentadas
- Sin `any` nuevo; números mágicos en `lib/constants.ts` o constantes del módulo

## Mensaje corto para pegar en cada sesión

```
@AGENTS.md @apps/api/lib/tenant-context.ts @.cursor/prompts/local-services-tech-builder.md @.cursor/prompts/tenants/local-services/piloto-automatizaciones.md
Sprint Local Services Week 1 (tenant local-services): [migración 0046 | rutas API | form book | tests aislamiento].
Rama: cursor/local-services-week1-* — commit convencional al cerrar cada sub-tarea.
```

## Referencia: prompts ampliados (producto)

Para ventas, ops, automatización y roadmap multi-semana, usar los prompts dedicados en `.cursor/prompts/` (p. ej. `local-services-sales-closer.md`, `local-services-ops-admin.md`, `local-services-automation.md`, `local-services-mvp.md`). El esquema canónico en código es **`platform.ls_*`** y las rutas bajo `/api/local-services/…`, no un schema SQL separado `local_services.*` salvo que un ADR lo defina.
