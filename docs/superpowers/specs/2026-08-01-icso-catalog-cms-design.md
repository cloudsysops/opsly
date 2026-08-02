---
status: approved
owner: operations
last_review: 2026-08-01
tenant_slug: n/a
---

# CMS de contenido ICSO (sub-proyecto 2 de 3)

**Contexto:** continuación del plan "CMS para administrar Peskids/tenants por módulos" ([sub-proyecto 1: activación de módulos por tenant](./2026-08-01-tenant-module-activation-design.md), ya en `main`). Este documento cubre el sub-proyecto 2: un CMS para el catálogo comercial (módulos, paquetes, verticales, copy en español, precios) que hoy alimenta `apps/icso/app/modules/[id]/page.tsx`, `apps/icso/app/quote/page.tsx` y otras páginas de venta, y que se edita a mano.

**Corrección tras investigar el despliegue real (reemplaza el diseño inicial de "fs read por request"):** `apps/icso` se despliega como contenedor Docker standalone (`apps/icso/Dockerfile`) que **no comparte filesystem** con `apps/api` ni con el checkout del repo en el VPS — su imagen de runtime solo tiene `.next/standalone`, `.next/static` y `public`. Un `fs.readFileSync` en request-time simplemente no tiene el archivo disponible. Además, `commercialCatalog` hoy se importa directo en **componentes cliente** (`QuoteBuilder.tsx`, `ContactForm.tsx`, ambos `'use client'`) — un módulo con `fs` no se puede importar ahí (no hay filesystem en el navegador). Y existe una segunda copia canónica en `config/commercial-catalog.json` (idéntica hoy, verificada por test), que ya lee directamente `scripts/sales/print-commercial-sow.mjs` (el CLI de SOW del founder, trabajo previo a esta rama).

Arquitectura corregida: `apps/api` (que sí corre con el checkout completo del repo) es la única fuente de verdad y el único que toca el archivo en disco — en `config/commercial-catalog.json` (se retira la copia duplicada en `apps/icso/content/`). `apps/icso` deja de importar el JSON y pasa a pedirlo por HTTP a `apps/api` en cada request, empujando el catálogo hacia abajo como prop (incluso a los componentes cliente). `scripts/sales/print-commercial-sow.mjs` no cambia — ya lee `config/commercial-catalog.json` por fs, que sigue siendo el archivo real.

## Alcance

Dar al operador (founder solo) un CRUD completo desde `apps/admin` sobre las tres colecciones del catálogo (`modules`, `packages`, `verticals`) más los campos escalares de metadata (`disclaimer`, `sales_pitch_es`, `currency`), con cambios visibles en `apps/icso` sin necesitar un redeploy.

Fuera de alcance: cambiar la estructura del JSON (los campos existentes se mantienen), mover el catálogo a una base de datos, tocar `apps/icso/app/api/leads/route.ts`, `scripts/sales/print-commercial-sow.mjs` (no necesita cambios) o cualquier otro flujo de ICSO no relacionado al catálogo.

## Arquitectura

```
apps/admin (nueva página /icso-catalog)
  → GET /api/icso/catalog         (apps/api) → { catalog, etag }   [requireAdminAccess]
  → PUT /api/icso/catalog         (apps/api) → valida Zod + integridad referencial + etag,
                                                escritura atómica (temp file + rename), devuelve nuevo etag
apps/api también expone:
  → GET /api/icso/catalog/public  (sin auth — es contenido de marketing ya público hoy en el HTML) → { catalog }

apps/icso (Server Components: app/page.tsx, app/quote/page.tsx, app/contact/page.tsx,
           app/modules/[id]/page.tsx, app/services/page.tsx, app/sitemap.ts)
  → fetch(`${OPSLY_API_URL}/api/icso/catalog/public`, { cache: 'no-store' }) en cada request
  → pasan el `CommercialCatalog` resultante como prop a los componentes hijos (server y cliente)
```

Ambos endpoints leen/escriben `config/commercial-catalog.json` (raíz del repo) vía `resolveOpslyRepoRoot()`, el mismo helper de `apps/api/lib/tools-execute.ts` ya usado en el sub-proyecto 1. `apps/icso/content/commercial-catalog.json` se elimina — deja de tener consumidores.

`etag` = hash SHA-256 del contenido actual del archivo (no un campo nuevo en el JSON) — detecta ediciones concurrentes (ej. dos pestañas abiertas del admin). Solo aplica al endpoint admin (`GET`/`PUT /api/icso/catalog`); el endpoint público no lo necesita.

**Nueva variable de entorno:** `OPSLY_API_URL` en `apps/icso` (server-side only, sin prefijo `NEXT_PUBLIC_` porque el fetch corre en Server Components, nunca en el navegador) — apunta a la base URL de `apps/api` (default de desarrollo local: `http://127.0.0.1:3000`).

**Manejo de fallo del fetch:** si `apps/api` no responde, la página lanza el error y lo maneja con un mensaje simple ("No se pudo cargar el catálogo") en vez de mostrar datos viejos silenciosamente — es un sitio de ventas, mostrar precios desactualizados sin avisar es peor que un error visible.

**`generateStaticParams` en `modules/[id]/page.tsx`:** hoy genera las rutas de módulos en build time a partir de `commercialCatalog.modules`. Un módulo agregado por el CMS después del build no tendría ruta pre-generada. Fix: mantener `generateStaticParams` con el snapshot de build (best-effort) pero agregar `export const dynamicParams = true`, para que Next.js renderee on-demand cualquier `id` que no esté en esa lista — así un módulo nuevo es alcanzable de inmediato sin esperar un redeploy.

## Modelo de datos

Sin tabla nueva — sigue siendo un único archivo, `config/commercial-catalog.json`, con su forma actual:
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
- `GET /api/icso/catalog/public` — sin auth; devuelve `{ catalog }` (sin `etag`, no lo necesita). Mismo contenido que ya se sirve hoy en el HTML de `apps/icso` — no expone nada nuevo.

Servicio: `apps/api/lib/services/icso-catalog.service.ts` (lectura/escritura/validación/integridad, compartido por los tres endpoints). Rutas: `apps/api/app/api/icso/catalog/route.ts` (GET/PUT admin) y `apps/api/app/api/icso/catalog/public/route.ts` (GET público).

## `apps/icso` — de import estático a fetch por request

`apps/icso/lib/commercial-catalog.ts` pierde el import del JSON y el `export const commercialCatalog`. Los tipos (`CommercialCatalog`, `CatalogModule`, `CatalogPackage`, `CatalogVertical`, `CatalogMoneyRange`, `VerticalStatus`, `CatalogRisk`) se mantienen igual. Cada función ayudante pasa a recibir el catálogo como primer parámetro explícito en vez de cerrar sobre la constante del módulo:

| Antes | Después |
|---|---|
| `getCatalogPackage(id)` | `getCatalogPackage(catalog, id)` |
| `getCatalogModule(id)` | `getCatalogModule(catalog, id)` |
| `modulesForPackage(pkg)` | `modulesForPackage(catalog, pkg)` |
| `mvpModules()` | `mvpModules(catalog)` |
| `getCatalogVertical(id)` | `getCatalogVertical(catalog, id)` |
| `packagesIncludingModule(moduleId)` | `packagesIncludingModule(catalog, moduleId)` |
| `buildPackageSow(packageId, verticalId?)` | `buildPackageSow(catalog, packageId, verticalId?)` |
| `buildPackageInquiryMessage(packageId, verticalId, moduleId?)` | `buildPackageInquiryMessage(catalog, packageId, verticalId, moduleId?)` |
| `buildDiscoveryMailto(options)` | `buildDiscoveryMailto(catalog, options)` |

`formatUsdRange`/`formatSetupPrice`/`formatOpsPrice` no cambian (ya reciben todo lo que necesitan por parámetro).

Nuevo archivo `apps/icso/lib/fetch-commercial-catalog.ts` (server-only): `async function fetchCommercialCatalog(): Promise<CommercialCatalog>` — hace el `fetch` a `GET /api/icso/catalog/public` con `cache: 'no-store'`, lanza si la respuesta no es 200.

Cada página que hoy importa `commercialCatalog` pasa a ser (o ya es) un Server Component que llama `await fetchCommercialCatalog()` una vez y reparte el resultado como prop `catalog` a sus hijos:
- `apps/icso/app/page.tsx` → `<SolutionGrid catalog={catalog} />`, `<VerticalGrid catalog={catalog} />`, `<PricingCards catalog={catalog} />`.
- `apps/icso/app/quote/page.tsx` → `<QuoteBuilder catalog={catalog} />`.
- `apps/icso/app/contact/page.tsx` → `<ContactForm catalog={catalog} />`.
- `apps/icso/app/modules/[id]/page.tsx` → usa `catalog` para `generateMetadata`/el body de la página; `generateStaticParams` sigue leyendo un snapshot vía `fetchCommercialCatalog()` en build/request time, más `export const dynamicParams = true` (ver arriba).
- `apps/icso/app/services/page.tsx`, `apps/icso/app/sitemap.ts` → llaman `fetchCommercialCatalog()` directamente (no tienen hijos a los que repartir props).

Componentes que cambian de "importan `commercialCatalog`" a "reciben `catalog` como prop": `SolutionGrid`, `PricingCards`, `VerticalGrid` (Server Components, sin cambio de directiva) y `QuoteBuilder`, `ContactForm` (Client Components — siguen siendo `'use client'`, solo cambia de dónde sale el dato: prop en vez de import).

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
- `apps/api/app/api/icso/catalog/public/__tests__/route.test.ts`: 200 sin auth, forma de la respuesta.
- `apps/icso/lib/__tests__/commercial-catalog.test.ts`: se reescribe para pasar un catálogo de prueba explícito a cada función ayudante (ya no depende de la constante `commercialCatalog` ni del archivo real) — mismos casos de negocio que ya cubre hoy (paquete destacado, mapeo de módulos, SOW, mailto), más una prueba de que `dynamicParams` sigue exportado como `true` en `modules/[id]/page.tsx`.
- Nuevo `apps/icso/lib/__tests__/fetch-commercial-catalog.test.ts`: mock de `fetch`, confirma `cache: 'no-store'`, confirma que lanza en respuesta no-200.
- UI: opcional (regla del repo).

## Siguiente sub-proyecto (no en este alcance)

3. Revisión del admin operativo de `apps/peskids/app/admin` (ya existe CRUD; evaluar qué falta).
