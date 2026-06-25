---
status: approved
owner: operations
last_review: 2026-06-24
tenant_slug: peskids
---

# Peskids — configuración del tenant (sub-proyecto 3 de 4)

**Contexto:** continuación del plan "todo productivo, no MVP" para Peskids ([sub-proyecto 1: students CRUD](./2026-06-23-peskids-admin-students-crud-design.md), PR #609; sub-proyecto 2 — gestión de leads — ya cubierto por PR #610 de otra sesión concurrente, ver [[project_peskids_concurrent_agents]]). Este documento cubre el sub-proyecto 3: configuración del tenant.

## Alcance

Hoy no existe ninguna pantalla de configuración. Varios valores de negocio están hardcodeados en el código:
- `admin-shell.tsx`: sede "Llanogrande" como texto fijo (dos lugares).
- `classes-panel.tsx` `emptyForm`: modalidad `'llanogrande'`, cupo `'8'`, precio `'85000'` (centavos COP) como literales.
- No existe ningún email/teléfono de soporte configurable en ningún lado.

Alcance de este sub-proyecto:
1. **Datos básicos de la academia**: nombre, etiqueta de sede (reemplaza el hardcode).
2. **Contacto de soporte**: email, teléfono.
3. **Parámetros operativos default**: modalidad, cupo, precio default para nuevas clases (reemplaza los literales en `classes-panel.tsx`).
4. **Enlazar notificaciones**: ya existe `/settings/notifications` (toggles por canal/evento, per-user) pero no está enlazado desde el nav del admin — agregar el link.

Fuera de alcance: el sistema de `pools` (sedes físicas reales para programar clases) no se toca — eso ya es una entidad propia con su propio modelo de datos; este sub-proyecto solo cubre el texto de sede mostrado en el shell del admin y los defaults del formulario de clases, no la gestión de piscinas/ubicaciones de calendario.

## Modelo de datos

Nueva tabla `public.tenant_settings`, una fila por tenant (mismo patrón que `students`/`leads`):

```sql
CREATE TABLE IF NOT EXISTS public.tenant_settings (
  tenant_id TEXT PRIMARY KEY,
  academy_name TEXT NOT NULL DEFAULT 'Peskids',
  sede_label TEXT NOT NULL DEFAULT 'Llanogrande',
  support_email TEXT,
  support_phone TEXT,
  default_modality TEXT NOT NULL DEFAULT 'llanogrande' CHECK (default_modality IN ('llanogrande', 'domicilio')),
  default_capacity INTEGER NOT NULL DEFAULT 8 CHECK (default_capacity > 0),
  default_price_cents INTEGER NOT NULL DEFAULT 85000 CHECK (default_price_cents >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.tenant_settings (tenant_id)
VALUES ('peskids')
ON CONFLICT (tenant_id) DO NOTHING;
```

Fila única garantizada por `tenant_id` como PK + el `INSERT ... ON CONFLICT DO NOTHING` en la misma migración, así el `GET` nunca encuentra "vacío" — siempre hay una fila con los defaults actuales (los mismos valores que hoy están hardcodeados, para que el cambio sea no disruptivo).

## API

`app/api/admin/settings/route.ts` (sin `[id]`, porque hay una sola fila por tenant):
- `GET`: devuelve la fila de `tenant_settings` para el tenant actual.
- `PATCH`: actualiza los campos enviados.

Mismo patrón que `admin/students`: `validateStaffSession()` + `isAdminSurfaceUser(auth.user)` en ambos métodos (solo owner/admin, igual que students — support/teacher no deben cambiar configuración del negocio). Zod en `lib/validation/tenant-settings.schema.ts`. Servicio en `lib/services/tenant-settings.service.ts` con `getTenantSettings()` / `updateTenantSettings(input)`.

## UI

- Página dedicada `/admin/settings/page.tsx` (no ancla en el dashboard único — es un formulario de configuración, no una lista, sigue el precedente de `/admin/messages` como página propia).
- Nuevo componente `components/admin/settings-form.tsx`: tres secciones en un solo form (Academia, Contacto de soporte, Parámetros operativos), guardar con `PATCH`.
- `admin-shell.tsx`: dos nav items nuevos — "Configuración" → `/admin/settings`, "Notificaciones" → `/settings/notifications` (página ya existente, solo se enlaza).
- `admin-shell.tsx`: el texto "Llanogrande" hardcodeado (sidebar header + badge) pasa a leer `sede_label` desde `tenant_settings` vía un fetch ligero (mismo patrón de polling que el contador de mensajes no leídos, pero sin polling — solo carga inicial, ya que cambia con poca frecuencia).
- `classes-panel.tsx`: `emptyForm` inicial pasa a poblarse desde `GET /api/admin/settings` en vez de los literales `'llanogrande'`/`'8'`/`'85000'`.

## Manejo de errores

Mismo estándar: `errorJson` con `request_id`, nunca el error crudo de Supabase. Si `GET /api/admin/settings` falla (ej. tabla sin fila por algún motivo), el servicio crea la fila default on-the-fly en vez de fallar (defensa adicional más allá de la migración).

## Testing

`app/api/admin/settings/__tests__/route.test.ts`: GET/PATCH con mocks de sesión + servicio (401/403/400/200), mismo patrón que `admin/students/__tests__/route.test.ts`.

## Siguiente sub-proyecto (no en este alcance)

4. Reportes exportables (PDF/CSV de métricas semanales/mensuales) — diseño aparte.
