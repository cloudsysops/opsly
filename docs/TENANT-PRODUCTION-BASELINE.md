# Baseline de producción — inventario tenants (Opsly)

> **Fuente de verdad operativa:** `AGENTS.md`, Supabase `platform.tenants`, y [`context/system_state.json`](../context/system_state.json).  
> [`config/opsly.config.json`](../config/opsly.config.json) es referencia de producto/DNS; puede ir **por detrás** del estado real en DB.

## 1. Inventario de tenants (runtime)

Última captura desde `context/system_state.json` (campo `tenants`):

| slug            | status (snapshot) |
| --------------- | ----------------- |
| smiletripcare   | active            |
| localrank       | active            |
| jkboterolabs    | active            |
| peskids         | active            |
| intcloudsysops  | active            |

**Acción:** antes de declarar “prod ready”, validar cada fila contra `platform.tenants` (status, `deleted_at`, `owner_email`, plan).

## 2. Inventario declarativo (`config/opsly.config.json`)

| slug          | plan    | ownerEmail (config)        |
| ------------- | ------- | -------------------------- |
| smiletripcare | startup | smiletripcare@gmail.com    |
| peskids       | startup | sierrasantiago90@gmail.com |

**Gap conocido:** el JSON de config lista menos tenants que `system_state`. Mantener el config alineado en cada onboard o tratarlo solo como plantilla de ejemplo.

## 3. Superficie API legacy (`apps/web`) vs canónica (`apps/api`)

Rutas bajo `apps/web/app/api/*` deben ser **proxies finos** hacia `apps/api` salvo excepción documentada.

| Ruta web (path)                 | Destino canónico (API)                    | Notas |
| ------------------------------- | ----------------------------------------- | ----- |
| `GET /api/health`               | `GET /api/health`                         | Cuerpo enriquecido en API (checks). |
| `GET /api/metrics`              | `GET /api/metrics/web-dashboard`          | Métricas “dashboard” anidadas (no confundir con `GET /api/metrics`). |
| `GET\|POST /api/tenants`        | `GET\|POST /api/tenants`                  | `POST` en web añade `tenantId` junto a `id` (compat). |
| `GET\|PATCH\|DELETE .../[id]`   | `.../api/tenants/[ref]`                   | `GET`: alias `containerStatus` ← `stack_status`. |
| `POST .../[id]/suspend`         | `POST .../suspend`                        | API devuelve `{ status: 'suspended' }`; web expone `{ success: true }`. |
| `POST .../[id]/resume`          | `POST .../resume`                         | API `{ status: 'active' }` → web `{ success: true }`. |
| `POST /api/webhooks/stripe`     | `POST /api/webhooks/stripe`               | Único webhook canónico. |
| `GET /api/public/tenants/status`| `GET /api/public/tenants/status`          | Rate limit por IP + email. |
| `GET\|POST /api/v1/keys`        | `GET\|POST /api/v1/keys`                  | Cabecera `x-tenant-id` (ver hardening). |
| `DELETE /api/v1/keys/[id]`      | `DELETE /api/v1/keys/[id]`                | Idem. |

**Variables:** el servidor `apps/web` necesita `INTERNAL_API_URL` (Docker) o `NEXT_PUBLIC_API_URL` para el proxy.

## 4. Riesgos priorizados (top 10)

| # | Riesgo | Mitigación inmediata |
| - | ------ | -------------------- |
| 1 | Proxy web sin URL de API → 503 | Definir `INTERNAL_API_URL` / `NEXT_PUBLIC_API_URL` en deploy de `web`. |
| 2 | Divergencia config vs DB tenants | Reconciliar `opsly.config.json` y/o dejar explícito que DB manda. |
| 3 | `POST /api/tenants` sin persistencia (histórico) | Tras deploy API reciente, validar `assertTenantPersisted` y logs en prod. |
| 4 | Rutas suspend/resume sin auth en web legado | Proxy fuerza flujo API con `requireAdminAccess`. |
| 5 | `v1/keys` solo con `x-tenant-id` | Rotación y endurecimiento: ver [TENANT-PRODUCTION-HARDENING.md](./TENANT-PRODUCTION-HARDENING.md). |
| 6 | Endpoint público `status` abusable | Rate limit Redis; monitorizar 429. |
| 7 | Secretos GCP incompletos (`system_state.doppler.missing`) | No activar features BigQuery/Vertex hasta vars en Doppler `prd`. |
| 8 | Stripe webhooks duplicados (web+api) | Un solo endpoint en Stripe → URL del API; web solo reenvía si aún apunta a host legacy. |
| 9 | Health API depende de Supabase/Redis alcanzables | Alertar si `checks` degradan en `/api/health`. |
| 10 | Drift documentación | Actualizar este doc + `AGENTS.md` al cerrar cada sprint de tenants. |

## 5. Referencias

- [TENANT-PRODUCTION-CHECKLIST.md](./TENANT-PRODUCTION-CHECKLIST.md) — criterios por tenant.
- [TENANT-PRODUCTION-HARDENING.md](./TENANT-PRODUCTION-HARDENING.md) — seguridad y evidencias.
- [TENANT-PRODUCTION-ROLLOUT.md](./TENANT-PRODUCTION-ROLLOUT.md) — cohortes y rollback.
- [runbooks/TENANT-ONBOARDING-TRIAGE.md](./runbooks/TENANT-ONBOARDING-TRIAGE.md)
