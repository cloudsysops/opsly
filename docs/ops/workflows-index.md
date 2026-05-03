# Índice de workflows GitHub — Opsly (Maestro #3)

**Objetivo:** una sola tabla maestra + TSV machine-readable + plan de revisión sin tocar la rama `main` sin PR.

| Artefacto | Ruta |
|-----------|------|
| Catálogo TSV (regenerable) | [`workflows-catalog.tsv`](./workflows-catalog.tsv) |
| Auditoría narrativa (histórica) | [`workflows-audit.md`](./workflows-audit.md) |
| Plan archivo (dry-run) | [`../../scripts/archive-plan.sh`](../../scripts/archive-plan.sh) |
| Regenerar TSV | `bash scripts/generate-workflows-catalog.sh` |

## Categorías

| Categoría | Qué agrupa |
|-----------|------------|
| `ci-quality` | CI, validación estructura/contexto/Doppler, security scan, autofix, nightly |
| `deploy-release` | Deploy prod/staging, canary, bots de deploy, Guardian |
| `sync-docs` | Sync documentación, Obsidian, NotebookLM, gobernanza docs |
| `tenant-ops` | Limpieza demos, readiness onboarding, project sync, task-orchestrator CI |
| `backup` | Backup programado tenants |
| `health-autonomy` | Hermes health, autonomy safety |
| `experimental` | Pipelines poco frecuentes / evolución |

## Datos tabulados

El listado completo (**file**, **category**, **archive_tier**, **last_success_utc**, **usage_signal**, **notes**) vive en **`workflows-catalog.tsv`**. Regenera tras cambios relevantes en workflows o para refrescar timestamps desde GitHub:

```bash
bash scripts/generate-workflows-catalog.sh
bash scripts/archive-plan.sh
```

### Leyenda `archive_tier`

- **keep** — `usage_signal=yes` (al menos un `success` muestreado en `gh run list`).
- **review_quarterly** — sin `success` en la muestra: puede ser **manual**, **cron raro**, o **fallando**; requiere revisión humana antes de archivar.

## Cabecera en YAML

Cada workflow bajo `.github/workflows/*.yml` incluye una línea de referencia al catálogo:

`# Opsly — workflow catalog: docs/ops/workflows-index.md`

## Relación con otros maestros

- **Maestro #1** — actionlint + fixes en ramas dedicadas.
- **Maestro #2** — issue bankruptcy (`docs/ops/issue-bankruptcy-2026-05-03.md`).
- **Maestro #3** — este índice + TSV + `archive-plan.sh` + cabeceras.
- **Maestro #4** (pendiente) — SoT de docs / inventario ampliado.
