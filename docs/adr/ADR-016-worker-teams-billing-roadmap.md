# ADR-016 — Equipos de workers por tenant y billing ampliado (roadmap)

## Estado

**Propuesto / borrador** — 2026-04-12. No sustituye ADR-011 (orchestrator event-driven).

## Contexto

Se ha documentado un modelo de “equipos alquilables” con roles múltiples y medición CPU/memoria (`docs/WORKER-TEAM-ARCHITECTURE.md`, `docs/WORKER-TEAM-BILLING.md`). El monorepo ya incluye:

- `TeamManager` con equipos por especialización (BullMQ).
- LLM Gateway + `usage_events` + presupuestos portal.
- Separación control/worker (`OPSLY_ORCHESTRATOR_ROLE`).

## Decisión (alcance actual)

1. **No** introducir un segundo orquestador singleton en `apps/api` con estado en memoria para “equipos por tenant”.
2. Cualquier evolución debe **extender** colas/metadata existentes y respetar límites en `AGENTS-GUIDE.md` / `VISION.md`.
3. **Billing por CPU/memoria** requiere ADR de métricas y posible trabajo de datos; hasta entonces el billing IA sigue siendo **USD vía gateway** + **tenant_budgets**.

## Consecuencias

- Nuevas rutas `/api/workers/*` y dashboard solo tras diseño de seguridad y persistencia.
- Posible fase futura: colas namespaced por tenant o metadata estricta en `OrchestratorJob`.

## Referencias

- `docs/WORKER-TEAM-ARCHITECTURE.md`
- `docs/WORKER-TEAM-BILLING.md`
- `docs/adr/ADR-011-event-driven-orchestrator.md`
