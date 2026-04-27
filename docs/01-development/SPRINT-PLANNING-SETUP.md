# Sprint planning y task management (Opsly)

Sistema unificado: **Notion** como colaboración en tiempo real, **YAML + docs generados** en el repo para agentes y CI, **GitHub** para issues y automatización.

## 1. Principios (sin duplicar datos)

| Capa                                                                                                                               | Rol                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Notion** (bases Tasks / Sprints)                                                                                                 | Donde el equipo edita día a día                                                                    |
| **`docs/implementation/status.yaml`**                                                                                              | Vista consolidada para docs, hooks y PRs (puede poblar desde Notion con `npm run notion:fetch`)    |
| **`docs/generated/implementation-progress.auto.md`**, **`docs/generated/sprint-status.auto.md`**, **`docs/AGENTS-ASSIGNMENTS.md`** | **Generados** — no editar a mano; vista humana del sprint: **`SPRINT-TRACKER.md`** (raíz del repo) |
| **GitHub Issues**                                                                                                                  | Tracking técnico y enlaces desde Notion (opcional)                                                 |

Variables: ver [`docs/DOPPLER-VARS.md`](DOPPLER-VARS.md) (`NOTION_TOKEN`, `NOTION_DATABASE_TASKS`, …). No hardcodear IDs de base en código: usar env.

## 2. Notion — bases y propiedades

- Reutilizar las claves ya soportadas por `apps/notion-mcp` (`TASK_PROPS`, `SPRINT_PROPS`, …) cuando sea posible: [`docs/NOTION-MCP-SERVER.md`](NOTION-MCP-SERVER.md).
- Validación: `npm run notion:validate` (requiere `NOTION_TOKEN` + `NOTION_DATABASE_TASKS` o `NOTION_DATABASE_ID`).
- Modo estricto opcional: `NOTION_SCHEMA_STRICT=true` (propiedades extendidas).

## 3. GitHub

### Secreto `DISCORD_WEBHOOK_URL`

Opcional para notificaciones: [Settings → Secrets → Actions](https://github.com/cloudsysops/opsly/settings/secrets/actions).

### Issues desde Notion

```bash
export GITHUB_TOKEN=...   # fine-grained o PAT con issues:write
export GITHUB_REPOSITORY=cloudsysops/opsly
doppler run -- npm run github:sync-issues
```

Tras crear issues, enlazar la URL en Notion en la columna **GitHub Issue** (manual o futura API PATCH).

### GitHub Projects v2

El workflow [`.github/workflows/github-project-sync.yml`](../.github/workflows/github-project-sync.yml) es **placeholder**: Projects v2 usa GraphQL y `PROJECT_ID`; configurar en el repo cuando el board esté definido.

## 4. Comandos npm (raíz)

| Script                       | Descripción                                                                        |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| `npm run docs:sync`          | `implementation-progress.auto.md` + `sprint-status.auto.md` + `AGENTS-ASSIGNMENTS` |
| `npm run notion:fetch`       | Notion Tasks → merge en `status.yaml` (`sprints[0].tasks`)                         |
| `npm run notion:validate`    | Valida schema de la base                                                           |
| `npm run notion:sync`        | `notion:fetch` + `docs:sync`                                                       |
| `npm run github:sync-issues` | Crea issues sin URL en Notion                                                      |
| `npm run sprint:burndown`    | Actualiza serie `burn_down` en `status.yaml`                                       |
| `npm run sync:all`           | `docs:sync` + pasos opcionales Notion/GitHub si hay tokens                         |
| `npm run test:notion`        | Wrapper que valida si hay `NOTION_TOKEN`                                           |

## 5. Flujo diario / review

1. **Standup:** leer `docs/generated/sprint-status.auto.md` y `docs/AGENTS-ASSIGNMENTS.md` (tras `npm run docs:sync`); para narrativa humana, **`SPRINT-TRACKER.md`**.
2. **Sprint review:** métricas en YAML (`sprints[].burn_down`) y bloqueos en `blockers`.
3. **Retrospectiva:** velocity orientativa (horas/puntos según defináis en Notion).

## 6. Workflows GitHub

| Workflow                  | Cuándo                                                                |
| ------------------------- | --------------------------------------------------------------------- |
| `sync-docs.yml`           | Push en paths de implementación → regenera docs + opcional Discord    |
| `sync-all.yml`            | `workflow_dispatch` o cron diario → docs + burndown + commit opcional |
| `github-project-sync.yml` | Manual — documentación hasta automatizar GraphQL                      |

## 7. Troubleshooting

| Problema                          | Acción                                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `notion:validate` falla           | Comprobar integración Notion conectada a la base; nombres de propiedades (`Name`, `Status`, `Sprint`). |
| `notion:fetch` vacía tareas       | Revisar filtros/archivados en Notion; permisos de la integración.                                      |
| `github:sync-issues` no crea nada | `GITHUB_TOKEN`, `GITHUB_REPOSITORY`; issues ya con URL en Notion se omiten.                            |
| Bucle de commits                  | Los commits automáticos llevan `[docs-sync]` donde aplica; no usar `push --force` para “arreglar”.     |
| Conflicto Notion vs YAML          | Preferir Notion como operación diaria; volver a ejecutar `notion:fetch` y revisar diff.                |

## 8. Referencias

- [`docs/AUTO-SYNC-DOCS-SETUP.md`](AUTO-SYNC-DOCS-SETUP.md) — YAML → Markdown
- [`docs/AGENTS-ORCHESTRATION.md`](AGENTS-ORCHESTRATION.md) — roles y escenarios
- [`docs/DOPPLER-VARS.md`](DOPPLER-VARS.md) — variables Notion
