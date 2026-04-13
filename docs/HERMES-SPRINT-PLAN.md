# Hermes Sprint Plan (6 semanas, alineado al repo)

## Desambiguación

- **Hermes Orchestrator** (este documento): módulo multi-agente en `apps/orchestrator/src/hermes/`, cola `hermes-orchestration`, enriquecimiento con NotebookLM (`notebooklm-py` vía `executeNotebookLM`).
- **Hermes / metering IA** (`ROADMAP.md`, `VISION.md`): ledger de uso LLM (`usage_events`, costos por tenant). Mismo nombre en producto; contextos distintos — unificar narrativa cuando el orchestrator exponga métricas de decisión al ledger.

## Sprint Mapping vs estado del repo

### Sprint 0: Validación y credenciales (~3 días, no 1 semana completa)

**Estado:** ~70% del código ya en `main` (migración 0028, orchestrator, cliente NotebookLM, workflows, API métricas).

**Acciones reales Sprint 0:**

- [x] Commits atómicos Hermes + NotebookLM en el repo
- [ ] `npx supabase db push` (aplicar `0028_hermes_tables.sql` al proyecto Supabase objetivo)
- [ ] Doppler: `NOTEBOOKLM_ENABLED`, `NOTEBOOKLM_NOTEBOOK_ID`, `NOTEBOOKLM_DEFAULT_TENANT_SLUG`
- [ ] Smoke: `npm run notebooklm:sync` en entorno con Python + `notebooklm-py` + sesión Google
- [ ] Smoke: `HERMES_ENABLED=true` + orchestrator con Redis/Supabase; `npm run hermes:tick` o worker BullMQ
- [ ] `GET /api/hermes/metrics` con sesión admin → JSON coherente
- [ ] Gate: lo anterior OK → arranque Sprint 1

**No es obligatorio en Sprint 0:**

- Imagen Docker dedicada `opsly-hermes` o puerto 3012 (usar servicio orchestrator existente)
- Tabla `notebooklm_cache` en Postgres (cache en memoria en orchestrator)
- Workers Claude / Notion / GitHub Actions completos

### Sprint 1: Endurecimiento

- Migración opcional `notebooklm_cache` o Redis dedicado para TTL de queries
- Reducir `v1_stub`: más lógica real en `runTick` según política de producto
- Dashboard admin Hermes (más allá de `GET /api/hermes/metrics` + página NotebookLM actual)

### Sprint 2+: Multi-agente

- Nuevos workers solo con ADR y modelo de seguridad (no `npx cursor exec` en prod sin diseño)

## Limitaciones conocidas (Sprint 0–1)

- `NotebookLMClient.listDocuments()` devuelve `[]` (limitación cliente / notebooklm-py).
- `HermesOrchestrator.runTick` marca resultado `mode: "v1_stub"` — camino simplificado.
- Consultas NotebookLM en API requieren runtime Python + credenciales en el mismo proceso que ejecuta `executeNotebookLM`.
- CI `notebooklm-sync` instala `notebooklm-py` de forma best-effort; puede no autenticar sin secretos.

## Referencias ADR

- [ADR-014: NotebookLM agent](./adr/ADR-014-notebooklm-agent.md) — experimental, browser automation
- ADR futuro (TBD): límites de recursos Hermes en Compose, si se escala fuera del orchestrator monolítico
