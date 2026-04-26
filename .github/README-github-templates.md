# Guía de `.github/` — plantillas y gobernanza (Opsly)

<!--
Qué hace: documenta en español el propósito de los archivos bajo `.github/` que no son workflows.
Cuándo lo lees: al incorporarte al repo, al clonar plantillas para otro proyecto, o al dudar qué archivo tocar.
Reutilizar: copia este README a tu monorepo y ajusta la tabla (rutas, equipos, URLs raw).
-->

Este directorio agrupa **automatización** (`workflows/`), **plantillas** (issues, PRs), **CODEOWNERS**, instrucciones para Copilot y espejos de contexto (`AGENTS.md`, `VISION.md`, `system_state.json`) cuando el equipo los sincroniza.

## Tabla rápida

| Archivo                                       | Propósito                           | Cuándo se activa                                | Quién lo ve                                         |
| --------------------------------------------- | ----------------------------------- | ----------------------------------------------- | --------------------------------------------------- |
| `CODEOWNERS`                                  | Asigna revisores por ruta           | Al abrir o actualizar un PR que toca esas rutas | GitHub solicita review a usuarios/equipos indicados |
| `PULL_REQUEST_TEMPLATE.md`                    | Estructura y checklist del PR       | Al crear un PR                                  | Autor del PR y revisores                            |
| `ISSUE_TEMPLATE/bug_report.yml`               | Formulario de bug                   | New issue → Reporte de bug                      | Maintainers y quien reporta                         |
| `ISSUE_TEMPLATE/feature_request.yml`          | Formulario de mejora                | New issue → Solicitud de funcionalidad          | Producto / equipo técnico                           |
| `ISSUE_TEMPLATE/tenant_issue.yml`             | Incidencia por tenant               | New issue → Incidencia de tenant                | Operaciones / backend                               |
| `ISSUE_TEMPLATE/config.yml`                   | Issues en blanco y enlaces de ayuda | Pantalla “New issue”                            | Todos                                               |
| `copilot-instructions.md`                     | Límites y convenciones para Copilot | Al generar sugerencias en el editor             | Copilot / IDE                                       |
| `workflows/*.yml`                             | CI/CD y validaciones                | Push, PR, cron según cada workflow              | GitHub Actions (no documentados aquí en detalle)    |
| `AGENTS.md`, `VISION.md`, `system_state.json` | Espejo de contexto (opcional)       | Lectura por humanos o agentes                   | Equipo + validación en CI si aplica                 |

## Cómo reutilizar estas plantillas en un proyecto nuevo

1. Copia `CODEOWNERS`, `PULL_REQUEST_TEMPLATE.md`, `ISSUE_TEMPLATE/*.yml`, `copilot-instructions.md` y este `README-github-templates.md`.
2. Sustituye `@cloudsysops/...` y `@cboteros` por equipos o usuarios reales de tu organización GitHub.
3. Actualiza la URL en `ISSUE_TEMPLATE/config.yml` (`contact_links`) a tu documento de contexto (equivalente a `AGENTS.md`).
4. Ajusta labels en los YAML (`bug`, `enhancement`, `tenant`) para que existan en el repo destino (Settings → Labels).
5. Si permitís issues libres, cambia `blank_issues_enabled` a `true` en `config.yml`.
6. No olvides revisar que los paths en `CODEOWNERS` existan en el nuevo repo (p. ej. `infra/terraform/` puede añadirse más tarde).

## Workflows

Los archivos en `workflows/` **no** se modifican en la tarea que generó esta guía; para cambios de CI/CD seguir el proceso habitual de PR y revisión de `infra`/`CODEOWNERS` según corresponda.
