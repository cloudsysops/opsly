# ADR-037 — Opsly Local Services como plataforma multi-tenant reusable

## Estado

Aceptado (2026-05-02)

## Arquitectos

- **Claude** — Decisión arquitectónica estratégica, multi-tenant design
- **Codex** — Validación de implementabilidad en stack existente

## Contexto

Opsly requiere un nuevo product tier para escalar negocios locales de servicios técnicos (limpiezas de PCs, soporte de oficina, reparaciones de laptops) con automatización de 4 agentes IA: Sales Closer, Ops Admin, Tech Builder, Automation Engineer.

**Escenario inicial:**
- Usuario (1 persona, RI) genera $5k→$10k/mes con su propio negocio
- Futuro: otros Opsly customers reutilizan la misma plataforma para SUS negocios locales

**Pregunta clave:** ¿Arquitectura single-tenant (solo para ti) o multi-tenant (reusable)?

## Alternativas Consideradas

### Opción A: Single-tenant (solo para ti)
- Tablas de base de datos SIN tenant_id
- API routes sin aislamiento de tenant
- Configuración hardcodeada con tu nombre

**Rechazada porque:**
- Zero reusabilidad cuando llegue cliente #2
- Rediseño completo necesario luego
- Costo de refactorización > costo de multi-tenant inicial

### Opción B: Multi-tenant desde Day 1 ✅ **SELECCIONADA**
- Tablas con tenant_id (filtra automáticamente)
- API routes heredan tenant context vía AsyncLocalStorage
- RLS policies aislan datos por tenant
- Zero infra adicional (patrones ya existen en Opsly)

**Seleccionada porque:**
- Reutiliza tenant-context.ts, base-repository.ts existentes
- Escala transparentemente cuando sumamos cliente #2
- Costos de infra = 0 (multi-tenant cuesta igual que single-tenant en nuestro stack)

### Opción C: Hybrid (single-tenant con helpers para future multi)
- Rechazada por ser intermedia: complejas sin beneficios

## Decisión

**Multi-tenant architecture desde MVP Week 1.**

Toda tabla nueva (`local_services.services`, `local_services.customers`, `local_services.bookings`, `local_services.quotes`, `local_services.service_reports`) incluye:

```sql
tenant_id uuid REFERENCES platform.tenants NOT NULL
```

Toda ruta API (`/api/local-services/*`) heredita tenant context:

```typescript
const tenantId = getTenantIdFromContext(); // AsyncLocalStorage
const result = await repository.query(tenantId, params);
```

RLS policies en Supabase:
```sql
ALTER TABLE local_services.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "services_tenant_isolation"
  ON local_services.services
  FOR ALL USING (tenant_id = current_user_id()::uuid); -- mapped via JWT
```

## Consecuencias

### Positivas
- Futuro cliente #2 usa la misma codebase sin refactorización
- Zero cambios de infra (mismos containers, misma DB, RLS hace el trabajo)
- Seguridad: datos de un tenant NUNCA cruzan a otro
- Escalabilidad: N tenants con O(1) código nuevo

### Negativas (mitigadas)
- **Complejidad inicial:** Toda API debe ser "tenant-aware". *Mitigación:* templates en `.cursor/prompts/` forzan patrón.
- **Testing más complejo:** Pruebas deben validar aislamiento entre tenants. *Mitigación:* helper test utilities en `lib/__tests__/tenant-isolation.test.ts`.
- **Migration risk:** Si erro en RLS policy → data leak. *Mitigación:* validar RLS antes de deploy con `npm run validate-rls`.

## Notas Operacionales

### Para implementación (Week 1)
1. Crear migration `0046_local_services_core.sql` con todas las tablas + RLS policies
2. Extender `lib/tenant-context.ts` si necesario (probably ya cubre)
3. Crear `lib/repositories/LocalServicesRepository` extends BaseRepository
4. Toda ruta en `/api/local-services/*` usa `getTenantId()` + `LocalServicesRepository`

### Para testing
```typescript
// tests deben validar aislamiento
test("tenant A no ve datos de tenant B", async () => {
  const tenantA = await db.customers.get(tenantAId, customerId);
  expect(tenantA).toBeNull(); // customer es de tenant B
});
```

### Para future tenants
- Copiar `/apps/local-services` → `/apps/local-services-acme`
- Cambiar `brand: "ACME Corp"` en config
- RLS policies + API context automáticamente aislan datos
- Zero línea de código nueva necesaria para tenant #2

## Decisiones Relacionadas

- **ADR-038:** Custom quotes vs fixed pricing (CLaude)
- **ADR-039:** Sales channels — email + WhatsApp (Claude)
- **ADR-040:** Technician scaling model — solo → +assistant (Claude + Codex)
- **ADR-028:** Patrón de onboarding por tenant (precedente existente)

## Referencias

- Plan: `enchanted-swimming-gosling.md` (main Opsly Local Services plan)
- Tenant Context: `/apps/api/lib/tenant-context.ts`
- Base Repository: `/apps/api/lib/base-repository.ts`
- API Pattern: `/apps/api/app/api/billing/` (similar structure)
