---
status: draft
owner: operations
last_review: 2026-05-24
type: adr
tags:
  - opsly/adr
---

# ADR-043 — Publicación orgánica en Facebook Page vía Meta Graph API (Opsly)

## Estado

Aceptado — Fase 1 implementada en API (2026-05-10): `GET|POST /api/admin/facebook/page-post` (ver código en `apps/api`).

## Contexto

- **Meta Ads Manager** (Marketing API / conectores tipo “Ads”) cubre **campañas pagadas**, no el **feed orgánico** de la Page.
- La visión de producto es que **Opsly** gobierne publicación y calendario (con trazabilidad, `tenant_slug` / `request_id` donde aplique), no depender de automatización por navegador como vía de producción.
- Conectores externos (p. ej. asistentes con sesión de Facebook) pueden **redactar o pilotar** contenido; la **fuente de verdad operativa** debe vivir en el monorepo, Doppler y despliegue controlado.

## Decisión

1. **Vía canónica de publicación orgánica:** [Meta Graph API](https://developers.facebook.com/docs/graph-api) contra la **Facebook Page** (no confundir con el ad account `act_*`).
2. **Credenciales:** App en Meta for Developers, permisos mínimos acordes (p. ej. `pages_manage_posts`, `pages_read_engagement` según alcance); **Page access token** de larga duración o flujo documentado de renovación; secretos **solo en Doppler** ([ADR-003](./ADR-003-doppler-secrets.md)) — nunca en repo ni logs.
3. **Ejecución:** Un servicio interno **Opsly** (ruta API bajo control plane y/o job en `apps/orchestrator` / cola BullMQ) invoca Graph API para `POST /{page-id}/feed` (o endpoints equivalentes para el tipo de contenido). **No** usar RPA/navegador como backend oficial.
4. **Separación Ads vs orgánico:** Variables y runbooks distintos; documentar en el mismo ADR que **Ads** puede seguir usando Marketing API / herramientas ya existentes sin mezclar tokens de Page.
5. **Gobernanza:** Contenido generado por LLM pasa por **LLM Gateway** cuando use modelo cloud; opcional **approval humano** (cola o flag) antes de publicar en producción.

## Alternativas descartadas (producción)

- **Solo conector de terceros / navegador:** útil para pruebas o borrador; no auditable ni idempotente a escala.
- **Publicar desde el repo sin cola:** aceptable para MVP mínimo; la cola (BullMQ) se recomienda para reintentos, rate limits y correlación con jobs existentes ([ADR-011](./ADR-011-event-driven-orchestrator.md)).

## Consecuencias

### Positivas

- Misma línea que el resto de Opsly: secretos, logs estructurados, tests, despliegue en VPS/workers.
- Posible multi-tenant futuro: una Page o token por tenant, aislado en DB + Doppler configs.

### Negativas / riesgos

- Revisión periódica de permisos y políticas de Meta; rotación de tokens.
- Límites de API y revisión de apps; el producto debe degradar con claridad si la app está en modo desarrollo.

## Implementación (fases sugeridas)

| Fase | Entregable |
|------|------------|
| 0 | Lista de permisos + App ID documentados (sin secretos); URL de callback si aplica OAuth |
| 1 | **`POST /api/admin/facebook/page-post`** (`requireAdminAccess`): cuerpo `{ message, dry_run? }`; **`GET`** devuelve `{ configured, graph_version }`. Cliente: `apps/api/lib/meta-page-feed.ts`. Vars: `META_PAGE_ID`, `META_PAGE_ACCESS_TOKEN`, opcional `META_GRAPH_API_VERSION`. |
| 2 | Job `facebook_page_post` (o nombre alineado a convención) + reintentos; métricas |
| 3 | Calendario / plantillas; integración Syra u otro generador solo como **productor de borrador**, no como emisor final sin paso Opsly |

## Referencias

- [ADR-003 — Doppler](./ADR-003-doppler-secrets.md)
- [ADR-011 — Orquestador event-driven](./ADR-011-event-driven-orchestrator.md)
- [ADR-039 — Canales sales (patrón integraciones externas)](./ADR-039-sales-channels-email-whatsapp.md)

## Notas

- Nombres concretos de variables Doppler (`META_PAGE_ACCESS_TOKEN`, `META_PAGE_ID`, `META_APP_SECRET`, etc.) se fijan al implementar; validar contra `scripts/check-tokens.sh` / listas CI si se añaden a `config/doppler-ci-required*.txt`.
- Cualquier conector externo (p. ej. “Lite”) es **complementario**; no sustituye este ADR para producción.

---

## Enlaces relacionados

- [[adr/README|adr]]
- [[brain/README|Brain Central]]
