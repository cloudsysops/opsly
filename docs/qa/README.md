---
status: canon
owner: qa
last_review: 2026-05-03
---

# QA — UI multi-ambiente (Opsly)

Flujo en **tres pasos**: tester humano → IA (priorización y prompts Cursor) → desarrollo.

| Documento | Rol |
| --------- | --- |
| [`TESTER-CHECKLIST.md`](TESTER-CHECKLIST.md) | §1 — Rutas, ambientes, checks transversales y **formato de hallazgos** (tabla). |
| [`BACKLOG-IA-PROMPT.md`](BACKLOG-IA-PROMPT.md) | §2 — Definición de listo (DoD), deduplicación, mapping a código, **prompts ejecutables para Cursor**. |
| [`../../scripts/qa-hallazgos-copy-hint.sh`](../../scripts/qa-hallazgos-copy-hint.sh) | Opcional: recordatorio para copiar hallazgos al portapapeles (macOS/Linux). |

**Issue en GitHub:** plantilla *QA hallazgo UI* (`.github/ISSUE_TEMPLATE/qa_hallazgo.yml`) — abre un issue por S1/S2 o agrupa hallazgos con enlaces a capturas.

**Relacionado:** [`../TEST_PLAN.md`](../TEST_PLAN.md), [`../01-development/QA-REVIEW-COMPLETE.md`](../01-development/QA-REVIEW-COMPLETE.md), Playwright portal `npm run test:e2e --workspace=@intcloudsysops/portal`.
