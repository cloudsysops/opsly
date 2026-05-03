---
status: canon
owner: qa
last_review: 2026-05-03
---

# Checklist tester — UI en todos los ambientes (Opsly)

## Objetivo

Recorrer **web**, **portal** y **admin** en **local** y **staging** (y pre-prod/prod si aplica), con rol conocido, y documentar hallazgos en el **formato de tabla** del final (un bloque por hallazgo).

**No pegar contraseñas ni tokens** en el issue/chat: solo “rol usado” y evidencia (captura, código HTTP, mensaje de error redactado).

---

## Ambientes — rellenar base URL

Dominios de referencia (`config/opsly.config.json`): `ops.smiletripcare.com`, `api.*`, `admin.*`, `portal.*`.

| Ambiente | Web | Portal | Admin | API health |
| -------- | --- | ------ | ----- | ---------- |
| Local | `http://127.0.0.1:3003` | `http://127.0.0.1:3002` | `http://127.0.0.1:3001` | `http://127.0.0.1:3000/api/health` |
| Staging | (si desplegada) | `https://portal.ops.smiletripcare.com` | `https://admin.ops.smiletripcare.com` | `https://api.ops.smiletripcare.com/api/health` |

**Puertos locales** (`package.json` por app): web **3003**, portal **3002**, admin **3001**, API **3000**. Si a la vez levantas **MCP** en 3003, cambia el puerto de web o MCP para evitar colisión.

**Roles típicos:** `admin-supabase`, `portal-owner`, `portal-invited`, `demo-readonly-admin`.

---

## A) Web (`apps/web`)

- `/`
- `/para-agencias`
- `/checkout/success`
- `/checkout/cancel`

## B) Portal (`apps/portal`)

- `/login`
- `/invite/[token]` (si hay flujo válido)
- `/dashboard`, `/dashboard/developer`, `/dashboard/managed`
- `/dashboard/[tenant]/workflows`, `/dashboard/[tenant]/subscriptions`, `/dashboard/[tenant]/invoices`, `/dashboard/[tenant]/invoices/new`, `/dashboard/[tenant]/invoices/[id]`
- `/dashboard/security-defense`, `/shield/dashboard`, `/mission-control`
- `/onboarding/step-1`, `/onboarding/step-2`, `/onboarding/authorize-deployment`
- `/landing` (si enlazada)
- `/admin/dashboard` (ruta bajo portal si aplica)

## C) Admin (`apps/admin`)

- `/login` (si aplica en vuestro despliegue)
- `/dashboard`
- `/tenants`, `/tenants/[tenantRef]`, `/tenants/[slug]/graph` (si accesible)
- `/insights`, `/agents`, `/agents-team`
- `/metrics/llm`, `/metrics/ollama`, `/workers-ollama`
- `/costs`, `/feedback`, `/invitations`, `/settings`
- `/defense-platform`, `/notebooklm`, `/openclaw-governance`, `/approval-decisions`
- `/monitoring/mac2011`, `/mission-control`, `/mission-control/office`
- `/machines`, `/api-surface`

## D) APIs / superficies cruzadas (smoke desde browser o curl)

- Health API (tabla ambientes).
- Rutas **Defense** si las usáis en staging: `GET /api/defense/pricing`, listados/acciones según rol admin (desde Network tab al usar admin).

## E) Checks transversales (cada página)

- Carga sin error de app; sin layout roto obvio.
- Consola del navegador: errores en rojo.
- Red: 4xx/5xx en llamadas a `api.*`.
- Responsive mínimo: ancho ~390px en vistas críticas (login, dashboard).
- Teclado: foco visible en login y formularios principales.
- Mezcla ES/EN en copy: anotar si es inconsistente.

---

## Formato de salida — **un hallazgo = una tabla**

Copia y rellena **una tabla por hallazgo** (facilita issues y el prompt de IA en `BACKLOG-IA-PROMPT.md`):

| Campo | Valor |
| ----- | ----- |
| **ID** | QA-001 (incremental manual) |
| **Ambiente** | local / staging / prod |
| **App** | web / portal / admin |
| **Ruta** | ej. `/dashboard/[tenant]/workflows` |
| **Pasos reproducción** | 1. … 2. … 3. … |
| **Resultado esperado** | … |
| **Resultado actual** | … / Error consola: … |
| **Severidad** | S1 (bloqueante) / S2 (alto) / S3 (medio) / S4 (bajo) |
| **Tipo** | bug / UX / copy / a11y / performance / API |
| **Evidencia** | Adjunto captura o “Network: GET … → 403” |
| **Notas** | Solo Chrome / solo rol X / … |

Cuando termines, pega todas las tablas en un issue con la plantilla **QA hallazgo UI** o en un doc interno, y enlázalas en el prompt de [`BACKLOG-IA-PROMPT.md`](BACKLOG-IA-PROMPT.md).
