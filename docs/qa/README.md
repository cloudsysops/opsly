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
| [`../../scripts/qa-hallazgos-copy-hint.sh`](../../scripts/qa-hallazgos-copy-hint.sh) | Opcional: copiar hallazgos al portapapeles (macOS/Linux). |
| [`../../scripts/submit-qa-issue.sh`](../../scripts/submit-qa-issue.sh) | Crear issue con `gh` (`bug` + `qa-ui`) desde un `.md` de cuerpo. |

**Issue en GitHub:** plantilla *QA hallazgo UI* (`.github/ISSUE_TEMPLATE/qa_hallazgo.yml`) — etiquetas `bug` y **`qa-ui`**. Agrupa hallazgos en un solo issue o abre varios a mano.

**Discord:** si el repo tiene el secret `DISCORD_WEBHOOK_URL`, el workflow [`.github/workflows/qa-issue-notify.yml`](../../.github/workflows/qa-issue-notify.yml) envía un aviso breve (título + enlace) al **canal vinculado a ese webhook** al abrir el issue o al añadir la etiqueta `qa-ui`.

**Relacionado:** [`../TEST_PLAN.md`](../TEST_PLAN.md), [`../01-development/QA-REVIEW-COMPLETE.md`](../01-development/QA-REVIEW-COMPLETE.md), Playwright portal `npm run test:e2e --workspace=@intcloudsysops/portal`.
