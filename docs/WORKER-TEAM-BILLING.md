# Workers alquilables y billing — modelo y estado

> **Estado:** documento de **modelo de negocio + integración técnica** con lo ya implementado. Las tablas de precio en dólares del prompt maestro son **ilustrativas**; la fuente comercial sigue siendo **`VISION.md`** y contratos reales.  
> **No** se ha añadido un paquete `apps/billing` ni un `WorkerRateLimiter` Redis separado en esta entrega: duplicaría `usage_events`, LLM Gateway y `tenant_budgets`.

## Componentes reales hoy

| Capacidad | Implementación |
|-----------|----------------|
| Uso LLM por tenant | `apps/llm-gateway` → agregados / `usage_events` |
| Tope mensual USD | `platform.tenant_budgets` + API `GET/PUT /api/portal/tenant/[slug]/budget` |
| Refuerzo de presupuesto | Cola `opsly-budget-enforcement`, `SuspensionWorker`, `POST /api/internal/budget-enforce` |
| Facturación Stripe (producto) | Webhooks y planes en `apps/web` / Doppler — ver `VISION.md` |
| Paralelismo por plan (orientativo) | `docs/AGENTS-GUIDE.md` (startup: 2, business: 5, enterprise: ∞) |

## Modelo ampliado (roadmap): CPU / memoria / workers

El prompt pide medir **CPU time**, **memory-GB·h** y **workers dedicados**. Eso exige:

1. **Definición de métrica** (¿solo LLM + jobs BullMQ o también contenedores tenant?) — alineación con ICP.
2. **Instrumentación** (Prometheus ya usado en admin para VPS; por-tenant puede requerir agente o labels).
3. **Política de overage** (Stripe metered vs factura manual).

Hasta entonces, el **proxy de coste** oficial para IA sigue siendo **USD vía LLM Gateway** + **budget** en portal.

### Tabla ilustrativa (no contractual en código)

| Concepto | Notas |
|--------|--------|
| Plan mensual base | Stripe + `VISION.md` |
| Incluido | Tokens/USD o jobs según plan |
| Exceso | `usage_events` + alertas; suspensión opcional vía budget |

## Flujo cliente (lógico)

1. Tenant con plan en `platform.tenants` / Stripe.
2. Jobs y llamadas LLM etiquetados con `tenant_slug` / `tenant_id`.
3. Agregación mensual para dashboard (admin ya expone métricas por tenant vía API).
4. Facturación: pipeline Stripe existente; **no** duplicar con endpoints genéricos `POST /api/workers/team` hasta diseño de seguridad (admin token, RLS).

## APIs del prompt (`/api/workers/team`, `/api/workers/task`)

**No implementadas** en esta tarea: requieren autenticación fuerte, persistencia y coherencia con `TeamManager`. Ver `docs/adr/ADR-016-worker-teams-billing-roadmap.md`.

## Panel “Billing & Worker Teams” en admin

**No añadido** como página nueva: el admin ya tiene rutas de métricas/costos según evolución del repo; enlazar desde menú existente cuando haya API estable.

## Comandos útiles (operación)

```bash
# Salud plataforma
./scripts/verify-platform-smoke.sh

# Type-check
npm run type-check
```

## Referencias

- `docs/WORKER-TEAM-ARCHITECTURE.md`
- `docs/LLM-GATEWAY.md`
- `docs/ORCHESTRATOR.md`
- `docs/SECURITY_CHECKLIST.md`
