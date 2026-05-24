---
status: draft
owner: operations
last_review: 2026-05-24
type: doc
tags:
  - opsly/doc
---

# Evidencia — Cierre Fase 1 autonomía (3 corridas E2E consecutivas)

**Plan:** [`docs/plans/AUTONOMY-COMPLETION-PLAN-2026-04-27.md`](../plans/AUTONOMY-COMPLETION-PLAN-2026-04-27.md) — criterio: flujo `research-run → artefactos → (opcional) sandbox_execution → estado job → reporte`.

## Corridas registradas (consecutivas, misma sesión UTC)

| # | Request / consulta | Reporte Markdown | Fecha UTC (cabecera informe) |
|---|-------------------|------------------|------------------------------|
| 1 | `Opsly autonomy phase1 evidence run 1` | [`research-9d271e20-1a44-44b5-a862-83299a4929b9.md`](../research/research-9d271e20-1a44-44b5-a862-83299a4929b9.md) | 2026-04-28T00:54:26Z |
| 2 | `Opsly autonomy phase1 evidence run 2` | [`research-2fccc968-1f7e-4fd0-ba07-e3357de8f2cf.md`](../research/research-2fccc968-1f7e-4fd0-ba07-e3357de8f2cf.md) | 2026-04-28T00:54:28Z |
| 3 | `Opsly autonomy phase1 evidence run 3` | [`research-e7714857-87b5-463b-9e9a-fbc117bcb222.md`](../research/research-e7714857-87b5-463b-9e9a-fbc117bcb222.md) | 2026-04-28T00:54:31Z |

## Notas

- Las tres corridas generaron informe bajo `docs/research/` vía `tools.cli research-run` (`generated_by: tools/cli research-run`).
- En esta evidencia histórica, la sección **Sandbox** figura como *No ejecutado* (encolado en dry-run o sin `--execute`). Para **E2E completo** con sandbox real y `GET /internal/job/:id`, usar orchestrator HTTP operativo y:
  ```bash
  export AUTONOMY_E2E_EXECUTE=true
  ./scripts/autonomy-phase1-e2e-record.sh
  ```
- `/v1/search` puede estar en modo degradado sin `TAVILY_API_KEY`; los informes igualmente se materializan (resultados vacíos permitidos salvo `--fail-fast`).

## Reproducir (3 corridas nuevas)

```bash
./scripts/autonomy-phase1-e2e-record.sh
# Con sandbox encolado de verdad (requiere gateway + orchestrator):
AUTONOMY_E2E_EXECUTE=true ./scripts/autonomy-phase1-e2e-record.sh
```

---

## Enlaces relacionados

- [[reports/README|reports]]
- [[brain/README|Brain Central]]
