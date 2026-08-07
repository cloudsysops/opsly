# 📋 Evolution Report — Orchestrator Visibility

**Fecha:** 2026-08-07
**Generado por:** Evolution Engine (auto-revisión) + revisión humana (RI)
**Estado:** Aplicado

---

## Contexto

Propuesta inicial: crear `lib/multi-agent-orchestrator/` como sistema nuevo de
selección de agentes, tracking de tokens y dispatch multi-fuente.

**Auto-revisión detectó duplicación** contra 3 sistemas ya en producción:

| Sistema existente | Ubicación | Capacidad que se iba a duplicar |
|---|---|---|
| `worker-selector.ts` | `lib/runtime/` | Selección de worker por costo/budget (scoring) |
| `orchestrator-integration.ts` | `lib/runtime/` | Ejecución de jobs con retry/fallback |
| `external-agent-registry` | `lib/external-agent-registry/` | Registro de 9 agentes CLI externos con routing por intent |

**Decisión (RI):** cerrar PR #923, no fusionar el sistema nuevo. Evolucionar
lo existente.

---

## Auditoría: qué faltaba realmente

Tras comparar la propuesta original contra el código existente, solo 3
capacidades eran genuinamente nuevas (no cubiertas por nada existente):

1. **Historial de uso persistente** — `worker-selector.ts` puntúa en cada
   llamada pero no guarda histórico ni proyecta gasto mensual.
2. **Adaptador de dispatch multi-fuente** — no había forma de generar un
   `OrchestratorJobRequest` desde chat/API/webhook; solo existía un script
   de ejemplo manual.
3. **Visibilidad en dashboard** — nada de esto era visible en Opsly Moon.

---

## Cambios aplicados

### ✅ Aprobado e integrado

| Cambio | Archivo | Tipo | Verificación |
|---|---|---|---|
| Tracker de uso/presupuesto | `lib/runtime/usage-tracker.ts` (nuevo) | `enhance` | 9 tests unitarios, type-check limpio |
| Wiring en orchestrator existente | `lib/runtime/orchestrator-integration.ts` (editado) | `integrate` | Cambio aditivo, no rompe firma pública |
| Adaptador de dispatch | `lib/runtime/task-dispatch.ts` (nuevo) | `integrate` | Delega en `processOrchestratorJob` existente, 4 tests |
| Endpoint de status | `apps/admin/app/api/orchestrator/status/route.ts` | `integrate` | Lee `getLocalFirstStatus()` + `external-agent-registry`, sin lógica propia |
| Endpoints de dispatch | `apps/admin/app/api/orchestrator/dispatch{,-chat}/route.ts` | `integrate` | Delegan en `dispatchTask`/`dispatchFromChat` |
| Panel de dashboard | `apps/admin/app/orchestrator/page.tsx` | `integrate` | Un solo archivo, sin componentes duplicados |

### ❌ Rechazado y eliminado

- `lib/multi-agent-orchestrator/` completo (agents/, core/, dispatch/, optimization/)
- `apps/admin/app/api/multi-agent/` (3 rutas)
- `apps/admin/components/multi-agent/` (7 archivos)
- `apps/admin/app/multi-agent/page.tsx`

**Razón:** duplicaba `worker-selector.ts`, `orchestrator-integration.ts` y
`external-agent-registry` sin aportar capacidad nueva más allá de las 3
identificadas arriba.

---

## Checks de auto-revisión (Evolution Engine)

Para cada cambio aplicado:

- ✅ **No duplicación** — cada archivo nuevo importa y extiende un módulo
  existente (`worker-selector`, `orchestrator-integration`, `external-agent-registry`);
  ninguno reimplementa selección de agentes o ejecución.
- ✅ **Incremental** — cambios aditivos; `orchestrator-integration.ts`
  mantiene su firma pública (`processOrchestratorJob`, `getLocalFirstStatus`)
  y solo agrega `getRecentUsage` + campo `budget` en la respuesta.
- ✅ **Verificable** — 13 tests nuevos (`usage-tracker.test.ts`,
  `task-dispatch.test.ts`), `tsc --noEmit` limpio en `lib/runtime` y
  `apps/admin`, `validate-structure.js` en verde.
- ✅ **Dependencias claras** — `task-dispatch.ts` depende solo de
  `orchestrator-integration.ts`; `usage-tracker.ts` no depende de nada del
  módulo (solo del tipo `WorkerType`).
- ✅ **Rollback viable** — cada archivo es aditivo y aislado; revertir es
  `git revert` del commit sin afectar `worker-selector.ts` ni
  `external-agent-registry` (no se tocó su lógica interna).

---

## Pendiente para siguiente iteración (no aplicado aún)

Estas quedan como propuestas para revisión futura, **no ejecutadas**:

1. **Persistencia en Supabase** — `usage-tracker.ts` expone un hook
   `onRecord` para conectar a una tabla (`multi_agent_executions` o
   similar) en lugar de memoria del proceso. Requiere decidir schema.
2. **Duplicación pre-existente en `lib/runtime/`** — el paquete publicado
   (`lib/runtime/src/`) y los archivos sueltos (`lib/runtime/*.ts`, donde
   viven `orchestrator-integration.ts` y `worker-selector.ts`) tienen
   nombres solapados (`environment-detector.ts` existe en ambos lados con
   propósitos distintos) y los archivos sueltos no están en el `exports`
   del package.json. No se tocó — es una decisión arquitectónica que
   requiere tu revisión (RI), no algo que deba resolverse de forma
   autónoma.
3. **Task registry real** — `task-dispatch.ts` extrae referencias tipo
   `PESKIDS-1.1` solo para trazabilidad; no existe un registro que resuelva
   esos IDs a contenido real de tarea. Si se quiere que el dispatch por ID
   funcione de verdad, hace falta definir dónde vive ese registro (¿Supabase?
   ¿archivo YAML por sprint?).

---

## Próximos pasos sugeridos

1. Revisar este reporte (RI)
2. Aprobar o ajustar los 3 pendientes de arriba
3. Si se aprueba Supabase, definir schema y conectar `onRecord`
4. Considerar si la duplicación `src/` vs. raíz en `lib/runtime/` merece su
   propio ADR
