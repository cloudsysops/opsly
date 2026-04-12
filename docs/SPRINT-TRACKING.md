# Opsly — Sprint tracking

> **Generado automáticamente** — fuente: [`docs/implementation/status.yaml`](implementation/status.yaml).
> Generado: 2026-04-12T18:35:16.860Z

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
| Actual (último) | 25 |

### Burndown (serie)

```
Day    Target  Actual
2026-04-12    40     8
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
