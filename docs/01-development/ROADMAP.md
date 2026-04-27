---
status: canon
owner: product
last_review: 2026-04-24
---

# Opsly — Roadmap de implementación (semanal)

> **Fuente de verdad de fases y principios:** [`VISION.md`](VISION.md) y [`AGENTS.md`](AGENTS.md).  
> **Última actualización:** 2026-04-24  
> Este archivo es el **desglose ejecutable por sprint**; no sustituye decisiones fijas (Compose, Traefik, Supabase, sin K8s).

## Convenciones

| Término                 | Significado en Opsly                                                                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hermes**              | Sistema de **metering/billing IA** (ledger `usage_events`, costos por tenant). Ver `VISION.md` — _no_ es un paquete Python externo obligatorio. |
| **Capa de decisión IA** | Lógica en **TypeScript** (`apps/llm-gateway`, `apps/orchestrator`): routing, fallback, presupuesto — extender lo existente.                     |
| **NotebookLM**          | **EXPERIMENTAL**, planes superiores + flag; ver `apps/notebooklm-agent`, MCP.                                                                  |

## Estado respecto a VISION.md

- **Fase 1 (Validación):** completada según `VISION.md` (health, tenant real, stack base).
- **Fase 2 (Producto):** en progreso; **segundo cliente real** (LegalVial via LocalRank) y endurecimiento staging/prod.
- **Fase 4 (OpenClaw / IA):** incrementos completados (MCP, orchestrator, LLM Gateway, planner remoto, feedback loop).
- **Consolidación arquitectónica:** context-builder-v2 archivado en `.archived/`.
- **Multi-región / multi-cloud como producto:** solo en horizonte **Fase 6+**; no es sprint inmediato salvo ADR.

---

## Fase 2 — Producto + IA (6 semanas orientativas)

Ventana sugerida: **2026-04-14 → 2026-05-25** (ajustar según capacidad).

### Semana 1 — Routing y costes visibles

**Objetivo:** Asegurar que cada request LLM relevante queda trazado y el gateway aplica políticas existentes.

| Tarea                                      | Referencia                                                |
| ------------------------------------------ | --------------------------------------------------------- |
| Revisar cadena de proveedores y health     | `apps/llm-gateway/src/providers.ts`, `llm-direct.ts`      |
| Metering unificado Hermes / `usage_events` | `VISION.md` (Sistema de Metering), paquete logger gateway |
| Tests regresión gateway                    | `apps/llm-gateway/__tests__/`                             |

**Checkpoint:** `npm run type-check`; tests gateway verdes; eventos con `tenant_slug` + `request_id`.

### Semana 2 — Planner + workers + NotebookLM (límites)

**Objetivo:** Planner remoto estable; NotebookLM solo donde aplique política de plan.

| Tarea                              | Referencia                                                                         |
| ---------------------------------- | ---------------------------------------------------------------------------------- |
| Planner → gateway                  | `apps/orchestrator/src/planner-client.ts`, `apps/llm-gateway/src/planner-route.ts` |
| Feature flag NotebookLM            | `NOTEBOOKLM_ENABLED`, `docs/OPENCLAW-ARCHITECTURE.md`                              |
| Sin llamadas LLM fuera del gateway | Regla en `AGENTS.md`                                                               |

**Checkpoint:** smoke orchestrator + job tipo acordado; NotebookLM no expuesto a Startup sin flag.

### Semana 3 — Context Builder + continuidad

**Objetivo:** Sesiones/contexto alineados al servicio existente (`apps/context-builder`), sin segundo motor paralelo sin ADR.

| Tarea                                | Referencia                                                  |
| ------------------------------------ | ----------------------------------------------------------- |
| Cliente orchestrator/context-builder | `docs/ORCHESTRATOR.md`, `apps/context-builder`              |
| Índice conocimiento repo             | `scripts/index-knowledge.sh`, `config/knowledge-index.json` |

**Checkpoint:** una prueba E2E documentada (script o test) que no requiera inventar API inexistente.

### Semana 4 — Cost transparency (admin)

**Objetivo:** Dashboard/API de costos alineados a datos reales (ya hay base en admin).

| Tarea                      | Referencia                           |
| -------------------------- | ------------------------------------ |
| `GET /api/admin/costs`     | `apps/api`, `docs/COST-DASHBOARD.md` |
| Alertas Discord opcionales | `scripts/notify-discord.sh`          |

**Checkpoint:** números coherentes con `usage_events` o fuente definida en código.

### Semana 5 — Feedback loop (producto) ✅ COMPLETADO

**Objetivo:** Cerrar bucle feedback → ML/mejoras sin romper Zero-Trust.

| Tarea                          | Referencia                                          |
| ------------------------------ | --------------------------------------------------- |
| `POST /api/feedback`           | Portal + API, `docs/SECURITY_CHECKLIST.md`          |
| Mejora de routing por feedback | Diseño en gateway/orchestrator, sin duplicar AGENTS |

**Checkpoint:** tests API feedback verdes; sin sustituir identidad tenant por cuerpo.

### Semana 6 — Segundo cliente + validación E2E 🟡 EN CURSO

**Objetivo:** Segundo tenant real u homólogo de staging; E2E invitaciones + stacks.

| Tarea          | Referencia                                                         |
| -------------- | ------------------------------------------------------------------ |
| Onboarding     | `scripts/onboard-tenant.sh`                                        |
| E2E            | `scripts/test-e2e-invite-flow.sh --api-url …`                      |
| Staging → prod | Plan transversal (backups, DNS, Doppler); no migrar datos a ciegas |

**Estado (2026-04-24):** LegalVial via LocalRank | smiletripcare/peskids/localrank activos | Pipeline fix aplicado | CI Docker fallando

**Checkpoint:** checklist Pre-Launch en `VISION.md` / runbooks; cliente #2 o decisión explícita de aplazamiento.

---

## Fase 3 — Escala (posterior a Fase 2 estable)

Alineado a `VISION.md` Fase 3: self-service, observabilidad por tenant, vector DB si hay demanda, **Multi-VPS antes que multi-región**.

| Ventana sugerida | Foco                                              |
| ---------------- | ------------------------------------------------- |
| Semanas 7–8      | Onboarding self-service, menos fricción operativa |
| Semanas 9–10     | Observabilidad SLI/SLO, runbooks incident         |
| Semanas 11–12    | Carga real, límites por plan, refinamiento costos |

**No incluido aquí como compromiso:** despliegue multi-cloud (AWS/Azure/GCP) como alternativas de runtime — contradice la simplicidad actual salvo ADR y cliente que lo pague.

---

## Milestones (tabla viva)

| Fecha objetivo | Milestone                                       | Criterio                                   |
| -------------- | ----------------------------------------------- | ------------------------------------------ |
| 2026-04-20     | Gateway + metering coherentes                   | Tests + logs `llm_call_*` con `request_id` |
| 2026-05-04     | Planner + flag NotebookLM                       | Smoke en staging                           |
| 2026-05-11     | Costos visibles admin                           | `/api/admin/costs` útil para operación     |
| 2026-05-25     | **Segundo cliente o cierre de gap documentado** | Tenant activo o decisión en AGENTS         |

---

## Proceso semanal sugerido

1. **Lunes:** priorizar 1–2 tareas del bloque de la semana; revisar bloqueantes en `AGENTS.md`.
2. **Miércoles:** `npm run type-check` + tests del workspace tocado.
3. **Viernes:** actualizar `AGENTS.md` (sección 🔄) y evidencia (curl, capturas) en PR.

---

## Regla de oro (repetida de VISION)

Antes de añadir features grandes: ¿hay **clientes pagadores** validando la necesidad? Si no → priorizar validación.
