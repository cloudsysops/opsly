---
status: approved
owner: operations
last_review: 2026-06-23
tenant_slug: peskids
---

# Peskids — CRUD de alumnos en admin (sub-proyecto 1 de 4)

**Contexto:** el cliente lleva mucho tiempo viendo esto como "MVP". Se decidió construir de verdad los módulos hoy marcados `NOT_IMPLEMENTED` en [ADMIN-FUNCTIONAL-QA-PROD.md](../../tenants/peskids/ADMIN-FUNCTIONAL-QA-PROD.md), en este orden: **(1) alumnos en admin** → (2) gestión completa de leads → (3) configuración del tenant → (4) reportes exportables. Este documento cubre solo el sub-proyecto 1.

## Alcance

Gestión real de alumnos individuales desde el panel admin (no agrupación por "familia" — decisión explícita: cada alumno mantiene su propio contacto de padre/madre, sin tabla `families` nueva).

- Listar alumnos del tenant con búsqueda por nombre/grado/estado.
- Crear alumno.
- Editar alumno.
- Dar de baja (`status = 'inactive'`) — nunca borrado físico, para no perder historial de clases/pagos.
- Contacto directo del padre/madre (mailto / WhatsApp), igual que en Leads.

Fuera de alcance: portal de familias (`/familias`), agrupar hermanos, historial de pagos/clases en esta misma vista.

## Modelo de datos

`public.students` ya existe (`001_create_peskids_schema.sql`): `id, tenant_id, name, grade, status, parent_email, enrollment_date, created_at, updated_at`. RLS ya activo con policy `parent_read_own_children` (`20260524_add_rls_policies_peskids.sql`).

Nueva migración `apps/peskids/migrations/20260623_add_student_admin_fields.sql`:

```sql
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS parent_phone TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;
```

Sin tabla nueva, sin tocar RLS. Las rutas admin escriben con el mismo cliente de service-role que ya usan `admin/classes` y `admin/team` (la autorización vive en la API route vía `validateStaffSession` + `isAdminSurfaceUser`, no en RLS) — mismo patrón ya establecido en el repo, no una excepción nueva.

## API

Mirror exacto de `app/api/admin/classes/route.ts`:

- `app/api/admin/students/route.ts`
  - `GET`: lista con `search`, `grade`, `status` como query params.
  - `POST`: crear alumno.
- `app/api/admin/students/[id]/route.ts`
  - `PATCH`: editar campos, incluido `status` (dar de baja / reactivar).
- `lib/validation/student.schema.ts`: `createStudentSchema`, `updateStudentSchema` (Zod).
- `lib/services/student.service.ts`: `listStudents`, `createStudent`, `updateStudent` — queries con `tenant_id = tenantSlug()`, mismo estilo que `class.service.ts`.

Auth: `validateStaffSession()` + `isAdminSurfaceUser(auth.user)` en los tres métodos, igual que `admin/classes`.

## UI

- `admin-shell.tsx`: nuevo `navOps` item `{ icon: Users, label: 'Familias', href: '/admin#families' }` entre Clases y Leads (coincide con el mapa de menú ya documentado para el cliente).
- Nuevo componente `components/admin/students-panel.tsx`, clonado de `classes-panel.tsx`: tabla (nombre, grado, estado, contacto), buscador, botón "+ Agregar alumno" con form (nombre, grado, email, teléfono, fecha matrícula, notas opcional), acción "Editar" y "Dar de baja" por fila, botones mailto/WhatsApp como en Leads.
- `dashboard-view.tsx`: insertar `<div data-admin-section="families"><StudentsPanel /></div>` junto a `ClassesPanel`.

## Manejo de errores

Estándar del repo: `errorJson(requestId, mensaje, status)` con mensajes de negocio en español, nunca el error crudo de Supabase. Logging con `console.error` + `request_id`, igual que el resto de `admin/*`.

## Testing

`app/api/admin/students/__tests__/route.test.ts` cubriendo GET/POST/PATCH (mock de sesión + Supabase, casos 401/403/400/201/200) — mismo patrón que `admin/classes/__tests__` y `admin/team/__tests__`. No se agrega capa de test de servicio: `class.service.ts` tampoco la tiene en este repo, así que no se introduce una convención nueva sin precedente.

## Siguientes sub-proyectos (no en este alcance)

2. Gestión completa de leads (cambiar estado in-app + indicador de sync GHL).
3. Configuración del tenant.
4. Reportes exportables.

Cada uno tendrá su propio diseño antes de implementarse.
