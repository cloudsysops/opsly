---
name: opsly-peskids
description: >
  Peskids After-School Swimming Program — context, DB schema, API patterns, auth flows,
  Stripe checkout, demo seed data, and client-delivery checklist.
  Use when working on landing, admin, teacher, families, auth, operations dashboard,
  classes/enrollments/payments, deploy, or any peskids tenant work.
session_context: "trabajo en peskids — landing, auth, familias, teacher, admin, deploy, clases, inscripciones"
subagents:
  - opsly-frontend
  - opsly-api
  - opsly-qa
  - opsly-supabase
when_not: "Si el cambio aplica a todos los tenants, usa opsly-tenant en vez de este skill. No usar para cambios globales de arquitectura."
---

# Peskids Tenant Skill

## Contexto rápido

| Campo | Valor |
|-------|-------|
| App | `apps/peskids/` |
| Prod URL | https://peskids.op-sly.com |
| Dev port | 3004 |
| Tenant slug | `peskids` |
| Owner | sierrasantiago90@gmail.com |
| Owner user_id | `0ef1a42a-9b5d-49b3-9604-8562d825c293` |
| Supabase project | `jkwykpldnitavhmtuzmo` |
| DB Schema | `peskids` (separado de `public`) |
| Fase | MVP Operaciones activo |

---

## Cuándo usar

Usa este skill para cualquier trabajo de Peskids: UI, auth, APIs, docs, deploy, smoke tests, cambios de rol, o trabajo en el schema de operaciones.

---

## Reglas core

- `tenant_slug` es la fuente de verdad — todos los queries usan `.eq('tenant_slug', 'peskids')`
- Si algo sirve para más de un tenant, va al core de Opsly y se activa por configuración
- Peskids no es un fork permanente; es un tenant incubado que puede extraerse a su propio repo
- No tocar otros tenants ni cambiar arquitectura global sin ADR

---

## DB Schema (`peskids.*`)

| Tabla | Propósito |
|-------|-----------|
| `pools` | Piscinas/ubicaciones (Llanogrande A/B, domicilio) |
| `classes` | Clases por profesor, piscina, nivel, horario |
| `class_enrollments` | Inscripciones de familias a clases |
| `payments` | Pagos Stripe por inscripción |

**PostgREST requiere header obligatorio:**
```bash
curl "${SUPABASE_URL}/rest/v1/classes" \
  -H "apikey: ${KEY}" \
  -H "Authorization: Bearer ${KEY}" \
  -H "Accept-Profile: peskids"   # SIN ESTO → PGRST205
```

**En código — usar siempre:**
```typescript
function peskidsClient() {
  return supabaseServer().schema('peskids');
}
// + .eq('tenant_slug', 'peskids') en cada query
```

---

## Precios (gotcha crítico)

Los precios se almacenan en **centavos × 100**:
- `85.000 COP` → `price_cents: 8500000` (no 85000)
- Display: `formatCop(cents)` → `new Intl.NumberFormat('es-CO', {currency:'COP'}).format(cents/100)`
- En el form admin el label dice "Precio COP" y el handler multiplica × 100 al guardar

---

## Datos demo en producción (seeded 2026-05-31)

**Pools:**
- `c311bc1e` — Piscina Llanogrande A (cap 12)
- `17f229bc` — Piscina Llanogrande B (cap 10)
- `7e27bb02` — Clase domicilio (cap 4)

**Clases programadas (Jun 6–13, 2026):**
- Delfines · sáb 9:00 · nivel 3 · Llanogrande B · $85.000 COP
- Tiburones · sáb 10:00 · nivel 5 · Llanogrande A · $90.000 COP
- Ballenas · sáb 11:00 · nivel 4 · Llanogrande B · $85.000 COP
- Sirenas · dom 9:00 · nivel 2 · Llanogrande A · $80.000 COP
- Pececitos · sáb 9:00 (Jun 13) · nivel 1 · domicilio · $70.000 COP

---

## Rutas API clave

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/health` | — | Health check |
| GET/POST | `/api/admin/classes` | staff session | Lista/crea clases |
| GET/POST/PATCH | `/api/admin/classes/[id]` | staff session | Detalle/update clase |
| GET | `/api/admin/team` | staff session | Team con user_id hydratado |
| POST | `/api/payments/checkout` | family session | Stripe checkout |
| POST | `/api/webhooks/stripe` | HMAC | Webhook Stripe |

---

## Auth flows

### Admin/Staff
- Login en `/admin/login` → Supabase auth → cookie `sb-*-auth-token`
- `validateStaffSession()` — **solo cookies** (no Bearer header en rutas admin)
- Para tests: cookie `admin-token` = `DASHBOARD_ADMIN_SECRET`
- Staff whitelist en `lib/staff-user.ts` por email

### Familias
- `validateFamilyRequest(req)` — Supabase session vía Bearer token
- RLS: `family_user_id = auth.uid()` en `class_enrollments`

---

## Team management (gotcha)

`loadPeskidsTeam()` en `lib/team-management.ts` hydrata `user_id` de miembros sin él via `resolveAuthUserIdByEmail()`. Esto es necesario porque el owner puede existir en `auth.users` pero no tener el `user_id` mapeado en `tenant_memberships`.

---

## Superficies

- `Landing` (`/`) — home pública con hero, niveles, Instagram feed
- `Familias` (`/familias`) — acceso familias: ver clases, inscribirse, pagar
- `Teacher` (`/teacher`) — agenda docente, clases asignadas
- `Support` (`/support`) — mensajes, seguimiento
- `Admin` (`/admin`) — dashboard operativo: clases, team, leads, configuración

---

## Workflow de desarrollo

1. Identifica la superficie y el rol
2. Decide si la capacidad debe vivir en Opsly core o solo en Peskids
3. `npm run type-check` antes de cada commit
4. Usa helpers: `peskidsClient()`, `validateStaffSession()`, `validateFamilyRequest()`
5. Smoke en navegador para el rol afectado antes de marcar como completo

---

## Validación mínima antes de PR

```bash
cd apps/peskids
npm run type-check   # debe pasar sin errores
npm run lint         # debe pasar
```

---

## Migraciones

| Archivo | Estado |
|---------|--------|
| `apps/peskids/migrations/001–009_*.sql` | Aplicadas |
| `apps/peskids/migrations/010_peskids_operations_grants_rls.sql` | Aplicada |
| `supabase/migrations/0070_peskids_operations_grants_rls.sql` | Pendiente linked project |

```bash
# Aplicar al linked project
cd apps/peskids && doppler run --project ops-intcloudsysops --config prd -- \
  npx supabase db push --linked
```

---

## Seed scripts

```bash
doppler run --project ops-intcloudsysops --config prd -- ./scripts/seed-peskids-pools.sh
doppler run --project ops-intcloudsysops --config prd -- ./scripts/seed-peskids-demo-class.sh
```

---

## Estado de entrega (2026-05-31)

| Feature | Estado |
|---------|--------|
| Landing page | ✅ Live |
| Admin login + dashboard | ✅ Funcional |
| Crear/listar clases | ✅ Con selector profesor/piscina |
| Team management | ✅ user_id hydratado por email |
| 5 clases demo seeded | ✅ Niveles 1–5 Jun 6–13 |
| Inscripción familias (API) | ✅ Implementada |
| Stripe checkout | ✅ API lista, config prod pendiente |
| n8n CRM workflows | ⚠️ Pendiente activar en VPS |
| PR #474 merge → deploy | ⏳ Pendiente |

---

## No hacer

- No hardcodear `peskids` como caso especial cuando la regla pertenece al core
- No mezclar admin, support y teacher en la misma UX
- No dejar rutas públicas leyendo datos de otro `tenant_slug`
- No usar `Accept-Profile: public` para tablas del schema `peskids`

