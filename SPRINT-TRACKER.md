---
status: canon
owner: operations
last_review: 2026-04-24
---

# Opsly — Sprint tracker (operativo)

> **Sincronización:** este archivo es la **vista semanal editable** en git.  
> **Fuente de verdad de fases:** [`ROADMAP.md`](ROADMAP.md), [`VISION.md`](VISION.md), [`AGENTS.md`](AGENTS.md).  
> **Actualizar:** al cerrar cada día/semana (métricas y checkboxes).

---

## Semana 1 — Routing y costes visibles

**Ventana:** 2026-04-14 → 2026-04-20 (ajustar si aplica)  
**Objetivo ROADMAP:** Requests LLM trazados; gateway y políticas coherentes; tests de regresión.

### Resumen ejecutivo

| Métrica                                  | Meta                                                    | Actual | Notas                                                  |
| ---------------------------------------- | ------------------------------------------------------- | ------ | ------------------------------------------------------ |
| Tareas ROADMAP completadas               | 3 bloques (proveedores/health, metering, tests gateway) | ☐      | Marcar al cerrar                                       |
| `npm run type-check`                     | Verde                                                   | ☐      | En CI + local                                          |
| Tests `llm-gateway`                      | Suite verde                                             | ☐      | `npm run test --workspace=@intcloudsysops/llm-gateway` |
| Eventos con `tenant_slug` + `request_id` | Donde aplique gateway                                   | ☐      | Ver logs estructurados                                 |

### Entregables (alineados al repo real)

| ID       | Tarea                                                | Referencia código                                                                     | Estado |
| -------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------- | ------ |
| **S1.A** | Revisar cadena de proveedores y health               | `apps/llm-gateway/src/providers.ts`, `llm-direct.ts`, `health-daemon.ts`              | ☐      |
| **S1.B** | Verificar metering / `usage_events` / logger gateway | `VISION.md` (Hermes metering), `apps/llm-gateway/src/logger.ts`, paquetes compartidos | ☐      |
| **S1.C** | Tests regresión gateway                              | `apps/llm-gateway/__tests__/`                                                         | ☐      |

**No es obligatorio esta semana:** crear `llm-router.ts` ni `execute-task.ts` si no están en el plan técnico acordado — ver [`docs/IMPLEMENTATION-IA-LAYER.md`](docs/IMPLEMENTATION-IA-LAYER.md).

### Checklist diario (opcional)

| Día | Enfoque                                       | Hecho |
| --- | --------------------------------------------- | ----- |
| Lun | S1.A inventario + notas                       | ☐     |
| Mar | S1.A ajustes menores + type-check             | ☐     |
| Mié | S1.B revisión trazas / eventos                | ☐     |
| Jue | S1.C tests nuevos o reforzados                | ☐     |
| Vie | Resumen + `./scripts/weekly-sprint-report.sh` | ☐     |

### Integración externa (manual)

- **GitHub Projects:** crear proyecto “Opsly Fase 2” e importar filas S1.A–S1.C como issues si queréis tablero.
- **Notion / Linear:** enlazar a este archivo o a issues; la fuente en repo sigue siendo `SPRINT-TRACKER.md` + `ROADMAP.md`.

---

## Plantilla — Semana 2 (copiar cuando empiece)

**Ventana:** _YYYY-MM-DD → YYYY-MM-DD_  
**Objetivo ROADMAP:** _Planner + workers + NotebookLM (límites)_

| ID   | Tarea | Referencia                              | Estado |
| ---- | ----- | --------------------------------------- | ------ |
| S2.A | …     | `planner-client.ts`, `planner-route.ts` | ☐      |

---

## Checklist de calidad (cada PR)

Ver [`docs/QUALITY-GATES.md`](docs/QUALITY-GATES.md).
