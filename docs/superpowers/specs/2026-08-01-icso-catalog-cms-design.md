---
status: approved
owner: operations
last_review: 2026-08-01
tenant_slug: n/a
---

# CMS de contenido ICSO (sub-proyecto 2 de 3)

**Contexto:** continuación del plan "CMS para administrar Peskids/tenants por módulos" ([sub-proyecto 1: activación de módulos por tenant](./2026-08-01-tenant-module-activation-design.md), ya en `main`). Este documento cubre el sub-proyecto 2: un CMS para `apps/icso/content/commercial-catalog.json` — el catálogo comercial (módulos, paquetes, verticales, copy en español, precios) que hoy alimenta `apps/icso/app/modules/[id]/page.tsx` y `apps/icso/app/quote/page.tsx`, y que se edita a mano.

## Alcance

Dar al operador (founder solo) un CRUD completo desde `apps/admin` sobre las tres colecciones del catálogo (`modules`, `packages`, `verticals`) más los campos escalares de metadata (`disclaimer`, `sales_pitch_es`, `currency`), con cambios visibles en `apps/icso` sin necesitar un redeploy.

Fuera de alcance: cambiar la estructura del JSON (los campos existentes se mantienen), mover el catálogo a una base de datos, tocar `apps/icso/app/api/leads/route.ts` o cualquier otro flujo de ICSO no relacionado al catálogo.

## Arquitectura

```
apps/admin (nueva página /icso-catalog)
  → GET /api/icso/catalog   (apps/api) → { catalog, etag }   [requireAdminAccess]
  → PUT /api/icso/catalog   (apps/api) → valida Zod + integridad referencial + etag,
                                          escritura atómica (temp file + rename), devuelve nuevo etag
apps/icso (lib/commercial-catalog.ts)
  → deja de importar el JSON estático en build time; pasa a leerlo por request
    (fs.readFileSync vía process.cwd(), sin caché) → los cambios se ven al instante
```

Hoy `apps/icso/lib/commercial-catalog.ts` hace `import catalogJson from '@/content/commercial-catalog.json'`, resuelto en build time por Next.js — un cambio en el archivo no se ve hasta el próximo deploy de `apps/icso`. Este diseño lo cambia a una lectura dinámica por request (sin caché), así que editar en el admin se refleja al instante en el sitio.

`etag` = hash SHA-256 del contenido actual del archivo (no un campo nuevo en el JSON) — detecta ediciones concurrentes (ej. dos pestañas abiertas del admin). No se agrega infraestructura nueva: reutiliza el patrón de lectura/escritura de archivo seguro ya existente en `apps/api/lib/tools-execute.ts` (`resolveOpslyRepoRoot()`, validación de que el path no escapa el repo).

**Supuesto de despliegue:** `apps/api` y `apps/icso` corren del mismo checkout en el VPS (`apps/icso` tiene Dockerfile + compose service, no está en Vercel) — el archivo que escribe `apps/api` es el mismo que lee `apps/icso`. Si `apps/icso` alguna vez se despliega en un filesystem separado, este enfoque necesita revisarse (pasar a un fetch entre servicios o a una base de datos).

## Modelo de datos

Sin tabla nueva — sigue siendo `apps/icso/content/commercial-catalog.json`, con su forma actual:
- `modules[]`: `{ id, label, label_es, mvp_default, risk, summary }`
- `packages[]`: `{ id, name, name_es, ideal_for, setup_range_usd, ops_monthly_usd, highlighted, module_ids[], includes[], excludes[] }`
- `verticals[]`: `{ id, label, reference_tenant, status, recommended_package_id }`
- Escalares: `version`, `updated`, `owner`, `currency`, `disclaimer`, `source_docs[]`, `sales_pitch_es`, `repeat_commands`

El `PUT` solo permite editar `modules`, `packages`, `verticals`, `disclaimer`, `sales_pitch_es`, `currency` — `version`, `owner`, `source_docs`, `repeat_commands` quedan de solo lectura (son metadata operativa, no contenido comercial); `updated` se recalcula automáticamente al guardar (fecha del día).

## Integridad referencial

- `packages[].module_ids[]` debe referenciar ids que existan en `modules[]`.
- `verticals[].recommended_package_id` debe referenciar un id que exista en `packages[]`.
- Al intentar borrar un módulo o paquete todavía referenciado, el `PUT` rechaza con `409` y la lista de quién lo referencia (mismo espíritu que un FK `RESTRICT`) — no se auto-limpian referencias huérfanas.

## API — `apps/api`

- `GET /api/icso/catalog` — `requireAdminAccess`; lee el archivo, devuelve `{ catalog, etag }`.
- `PUT /api/icso/catalog` — `requireAdminAccess`; body `{ catalog, etag }`:
  1. Si el `etag` recibido no coincide con el hash actual del archivo → `409` "el catálogo cambió desde que lo cargaste, recargá y reintentá".
  2. Valida el `catalog` completo con Zod (forma de las 3 colecciones + escalares editables).
  3. Valida integridad referencial (ver arriba); `409` con detalle si falla.
  4. Escribe: serializa a JSON, escribe a un archivo temporal en el mismo directorio, `rename()` atómico sobre `commercial-catalog.json` (evita archivo corrupto si el proceso muere a mitad de escritura).
  5. Devuelve `{ ok: true, etag: <nuevo hash> }`.

Servicio: `apps/api/lib/services/icso-catalog.service.ts` (lectura/escritura/validación/integridad). Ruta: `apps/api/app/api/icso/catalog/route.ts`.

## UI — `apps/admin`

- Página nueva `apps/admin/app/icso-catalog/page.tsx`, enlazada desde el nav.
- Estado local: carga el catálogo completo al entrar (`GET`), lo edita en memoria, un botón "Guardar" dispara el `PUT` con el `etag` cargado.
- Tres secciones editables: **Módulos**, **Paquetes**, **Verticales** — cada una como lista con edición inline por fila, botón "+" para agregar, botón eliminar por fila (bloqueado con tooltip si está referenciado, mismo patrón de confirmación que otros borrados destructivos del admin).
- Bloque "Metadata" arriba con `disclaimer`, `sales_pitch_es`, `currency`.
- Error de guardado por conflicto de `etag`: mensaje claro + botón "Recargar" que vuelve a hacer `GET` (el operador pierde sus cambios no guardados — aceptable para un solo operador, se avisa antes de recargar).

## Manejo de errores

- Zod inválido → `400` con mensaje de campo, nunca el error crudo de Zod.
- Integridad referencial → `409` con la lista de entradas que referencian al ítem que se intenta borrar.
- Etag mismatch → `409` distinguible del error de integridad (cuerpos de respuesta con `reason` distinto: `'stale'` vs `'referenced'`).
- Fallo de escritura en disco → `500` sanitizado, logueado server-side con detalle.

## Testing

- `apps/api/lib/services/__tests__/icso-catalog.service.test.ts`: validación Zod (casos válidos/inválidos), integridad referencial (bloquea borrar módulo referenciado, bloquea borrar paquete referenciado), escritura atómica (mock de fs), cálculo de etag.
- `apps/api/app/api/icso/catalog/__tests__/route.test.ts`: 401 sin auth, 200 GET, 200 PUT válido, 409 etag stale, 409 integridad referencial, 400 Zod inválido.
- `apps/icso/lib/__tests__/commercial-catalog.test.ts`: confirma que la lectura es dinámica (no queda un `import` estático del JSON).
- UI: opcional (regla del repo).

## Siguiente sub-proyecto (no en este alcance)

3. Revisión del admin operativo de `apps/peskids/app/admin` (ya existe CRUD; evaluar qué falta).
