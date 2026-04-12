# Opsly — Planificación macro (herramientas + enlaces)

> **Roadmap semanal ejecutable:** [`../ROADMAP.md`](../ROADMAP.md)  
> **Tracker editable por sprint:** [`../SPRINT-TRACKER.md`](../SPRINT-TRACKER.md)  
> **Guía técnica IA:** [`IMPLEMENTATION-IA-LAYER.md`](IMPLEMENTATION-IA-LAYER.md)

## Fases (resumen)

| Fase | Documento | Contenido |
|------|-----------|-----------|
| Producto / comercial | [`VISION.md`](../VISION.md) | ICP, fases, límites, “Nunca” |
| Operación sesión a sesión | [`AGENTS.md`](../AGENTS.md) | Bloqueantes, decisiones, URL raw |
| Semanas 1–6 + milestones | [`ROADMAP.md`](../ROADMAP.md) | Tareas por semana |
| Esta semana (checkboxes) | [`SPRINT-TRACKER.md`](../SPRINT-TRACKER.md) | Progreso y métricas |

## Herramientas recomendadas

| Opción | Cuándo usarla |
|--------|----------------|
| **GitHub Projects** | Tablero junto a PRs e issues; sin coste extra en GitHub |
| **Issues + labels** | `roadmap`, `week-1`, área (`api`, `llm-gateway`, …) |
| **Notion / Linear** | Si el equipo ya las usa; **no** sustituyen `ROADMAP.md` en el repo |

## Automatización en este repo

- **CI:** [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) — type-check, tests, validaciones.
- **Pre-commit:** [`.githooks/pre-commit`](../.githooks/pre-commit) — `npm run type-check` + ESLint en `apps/api` staged.
- **Activar hooks:** `git config core.hooksPath .githooks` (ver README).
- **Reporte semanal (opcional):** [`scripts/weekly-sprint-report.sh`](../scripts/weekly-sprint-report.sh).

## Calidad y definición de “terminado”

- [`QUALITY-GATES.md`](QUALITY-GATES.md) — qué exigir antes de merge.
- [`CURSOR-DAILY-CHECKLIST.md`](CURSOR-DAILY-CHECKLIST.md) — checklist por sesión en Cursor.

## Alertas de retraso

No hay bot interno obligatorio: usar **Discord** (`scripts/notify-discord.sh`), **GitHub Actions** (fallo de CI), o recordatorios del Project. Si se añade integración nueva, documentarla aquí y en `AGENTS.md`.
