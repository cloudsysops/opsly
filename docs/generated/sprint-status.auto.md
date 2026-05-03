---
status: generated
source: docs/implementation/status.yaml
generated_by: scripts/generate-sprint-tracking.js
do_not_edit: true
---

<!-- This file is auto-generated. Do not edit manually. -->
<!-- See docs/generated/README.md for details. -->
<!-- For human-authored sprint execution, see ../../SPRINT-TRACKER.md -->

# Opsly — Sprint Status (Auto-Generated)

> **Generado automáticamente** — fuente: [`docs/implementation/status.yaml`](../implementation/status.yaml).
> Generado: 2026-05-02T23:45:42.291Z

## Sprint 1: Approval Gate + Vertex AI

- **Estado:** IN_PROGRESS
- **Inicio / fin:** 2026-04-12 → 2026-04-19
- **Goals:**
  - Implement Approval Gate (Sonnet 4)
  - Add Vertex AI embeddings
  - Setup auto-sync docs
  - Integrate Notion + GitHub
- **Capacity (h):** 40

| Métrica | Valor |
| --- | --- |
| Target | 40 |
| Actual (último) | 1 |

### Burndown (serie)

```
Day    Target  Actual
2026-04-12    40     8
2026-04-16    40     1
2026-04-17    40     1
2026-04-18    40     1
2026-04-19    40     1
2026-04-20    40     1
2026-04-21    40     1
2026-04-24    40     1
2026-04-25    40     1
2026-04-26    40     1
2026-04-27    40     1
2026-04-28    40     1
2026-05-01    40     1
```

### Tasks

| id | name | type | status | assignee | effort |
| --- | --- | --- | --- | --- | --- |
| approval-gate-worker | ApprovalGateWorker implementation | feature | ✅ DONE | Cursor | M |
| doppler-secrets | Configure Doppler secrets (GCP) | infra | ⏳ PENDING | Cristian | XS |
| supabase-migrations | Apply Supabase migrations | infra | ⏳ PENDING | Cristian | S |

## Blockers (resumen)

- **CRITICAL:** Doppler secrets GCP / Vertex no configurados en prd — Seguir docs/VERTEX-AI-SETUP.md; doppler secrets set GCLOUD_* y JSON SA.
- **CRITICAL:** Migraciones 0026/0027 no aplicadas en Supabase remoto — npx supabase db push (o pipeline migraciones) contra proyecto enlazado.

---

*No editar a mano — regenerar con `npm run docs:sync`.*
