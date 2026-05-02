# ADR-041 — Local Services Phase 1: Tenant-scoped API Architecture

## Estado
✅ Aceptado (2026-05-02)

## Arquitecto
**Cursor** — Implementation  
**Claude** — Validation & Architecture Review

## Contexto

Phase 1 de Opsly Local Services entregó la infraestructura API completa para booking, CRM, y quotes. Decisión arquitectónica clave: **cómo aislar datos por tenant en API routes**.

Opciones:
1. JWT claim `tenant_id` (frágil si claims se manipulan)
2. Path `[slug]` + JWT validation que slug == session.tenant.slug (propuesto)
3. Separar físicamente per app (escalable solo con N apps)

## Decisión

**Tenant-scoped API routes bajo `/api/local-services/tenants/[slug]/...`**

Cada ruta:
1. Extrae `slug` del path
2. Resuelve JWT del portal (`resolveTrustedPortalSession`)
3. Valida que `slug == session.tenant.slug` (falha 403 si no match)
4. Ejecuta lógica dentro de `runWithTenantContext({ tenantId, tenantSlug })`
5. Database queries heredan `tenant_id` filtering automáticamente

**Implementación:**
```typescript
// lib/local-services-dal.ts
export async function runLocalServicesTenantDal<T>(
  request: Request,
  pathSlug: string,
  fn: () => T | Promise<T>
): Promise<T | Response> {
  const resolved = await resolveTrustedPortalSession(request);
  if (!resolved.ok) return resolved.response; // 401/403
  
  if (!tenantSlugMatchesSession(resolved.session, pathSlug)) {
    return Response.json({ error: 'Tenant slug does not match' }, { status: 403 });
  }
  
  const { id, slug } = resolved.session.tenant;
  return runWithTenantContext({ tenantId: id, tenantSlug: slug }, fn);
}
```

**Rutas creadas:**
```
GET    /api/local-services/tenants/[slug]/services
GET    /api/local-services/tenants/[slug]/customers
GET    /api/local-services/tenants/[slug]/bookings
PATCH  /api/local-services/tenants/[slug]/bookings/[id]
GET    /api/local-services/tenants/[slug]/quotes
GET    /api/local-services/tenants/[slug]/reports

POST   /api/local-services/public/tenants/[slug]/bookings (public, no JWT)
```

## Consecuencias

### Positivas
- ✅ **Zero data leaks:** slug en URL + JWT validation + tenant_id en DB queries = defense in depth
- ✅ **Transparent tenant context:** `runWithTenantContext` automáticamente filtra queries (inherited from `getTenantContext()`)
- ✅ **Portal integration:** Reutiliza auth pattern existente (`resolveTrustedPortalSession`)
- ✅ **Multi-tenant by design:** Cada tenant nuevo = mismo código, diferente slug

### Negativas (mitigadas)
- **Slug mangling:** Usuario manipula URL slug → retorna 403 (esperado). *Mitigación:* JWT claim es fuente de verdad.
- **Public endpoint abuse:** `/public/tenants/[slug]/bookings` aceptable sin JWT. *Mitigación:* Rate-limit + CAPTCHA en Week 2.
- **Future scale:** 1000+ tenants = 1000+ routes en mismo deployment. *Mitigación:* Clustering por slug futuro si necesario.

## Implementación (Completed Phase 1)

### Database
- `supabase/migrations/0046_local_services_core.sql`
  - 5 tablas: services, customers, bookings, quotes, service_reports
  - RLS policies: `tenant_slug` filtrado en SELECT/INSERT/UPDATE
  - Indexes: `(tenant_slug, status)`, `(tenant_slug, created_at)` para perf

### API Layer
- `apps/api/lib/local-services-dal.ts` → DAL tenant-aware
- `apps/api/lib/repositories/local-services-repository.ts` → Query builders
- `apps/api/app/api/local-services/tenants/[slug]/...` → 6 rutas (GET bookings, services, etc.)
- `apps/api/app/api/local-services/public/tenants/[slug]/bookings` → Public booking creation

### Frontend
- `apps/local-services/` → Next.js 15 app
- `/book` → Public booking form (tenant_slug passed as URL param)
- `/dashboard` → Stub (auth in Phase 2)
- `components/booking-form.tsx` → Zod validation + submit

### Tests
- `apps/api/lib/__tests__/local-services-dal.test.ts` → Tenant isolation
- `apps/api/app/api/local-services/public/tenants/[slug]/bookings/__tests__/route.test.ts` → Public endpoint

### Validation
- OpenAPI 3.0 paths validated (`npm run validate-openapi`)
- Zod schemas: `BookingSchema`, `QuoteSchema`, `CustomerSchema`
- Type safety: No `any` in TypeScript

## Notas Operacionales

### Deployment
1. Aplicar migración 0046 a Supabase
2. Crear tenant en `platform.tenants` con `slug = 'local-services'` (o diferente per instalación)
3. Deployar apps/api + apps/local-services
4. Verificar `/book` carga + POST a `/api/local-services/public/tenants/[slug]/bookings` funciona

### Tenant Creation Script
```bash
# Crear tenant en plataforma (una sola vez por instalación)
./scripts/opsly.sh create-tenant local-services \
  --email "owner@example.com" \
  --plan startup \
  --name "Equipa"
```

### Future Extensions
- **Week 2:** Dashboard autenticado (auth.tenantSlug en sesión)
- **Week 3:** Technician portal (assigned_to = technician.id)
- **Week 4:** Admin dashboard (tenant owner sees revenue, customer list)

## Decisiones Relacionadas

- **ADR-037:** Multi-tenant architecture (applies here via runWithTenantContext)
- **ADR-038:** Custom quotes (stored in ls_quotes table)
- **ADR-039:** Sales channels (booking → email trigger in n8n Phase 2)
- **ADR-040:** Technician scaling (assigned_to column in ls_bookings)

## Referencias

- Phase 1 commit: d99abd7 (Cursor implementation)
- Tenant DAL pattern: `/apps/api/lib/local-services-dal.ts`
- API routes: `/apps/api/app/api/local-services/tenants/[slug]/`
- Migration: `supabase/migrations/0046_local_services_core.sql`
- Tests: `apps/api/lib/__tests__/local-services-dal.test.ts`
