# Agent orchestration (Opsly)

Coordinación entre **Cursor**, **Claude**, **GitHub Actions** y el **product owner**, sin duplicar la fuente de verdad operativa (Notion + repo).

## Roles y responsabilidades

| Agente | Rol principal | Entradas | Salidas |
|--------|----------------|----------|---------|
| **Cursor** | Implementación | Prompts, `status.yaml`, código existente | PRs, migraciones, scripts |
| **Claude** | Diseño y criterios | `AGENTS.md`, `VISION.md`, ADRs | ADRs, prompts, revisión |
| **GitHub Actions** | Automatización | Push, cron, secrets | CI, imágenes, docs sync, notificaciones |
| **Cristian** | Producto y prioridad | Notion, métricas, riesgos | Sprint, aprobaciones |

## Autonomía y límites

- **Cursor:** alta autonomía en código siempre que pasen `type-check`, tests del workspace y políticas del repo (sin secretos, sin `any` donde aplique).
- **Claude:** decisiones de arquitectura alineadas a `VISION.md`; cambios de contrato o infra requieren ADR o acuerdo explícito.
- **Actions:** no sustituyen revisión humana en merges a `main` si hay branch protection.

## Escenarios

### A — Nueva feature de fase

1. Tarea en **Notion** (o fila equivalente en `status.yaml` hasta conectar Notion).
2. Opcional: Issue GitHub (`github:sync-issues`).
3. Claude: ADR breve si hay decisión nueva.
4. Cursor: implementación + tests.
5. Actions: CI + deploy según flujo del repo.
6. `npm run docs:sync` para reflejar estado en docs generados.

### B — Bug

1. Issue o entrada Notion con prioridad.
2. Cursor: fix + test de regresión si aplica.
3. Merge tras CI verde.

### C — Sprint planning

1. Definir ventana y objetivos en Notion (base Sprints) o en `sprints[]` del YAML.
2. `npm run sprint:burndown` para serie diaria (o dejar que CI en `sync-all` lo haga).
3. Revisión con `docs/generated/sprint-status.auto.md` (y `SPRINT-TRACKER.md` para vista humana).

## Artefactos generados

| Archivo | Contenido |
|---------|-----------|
| `docs/AGENTS-ASSIGNMENTS.md` | Rol, capacidades y tareas por agente lógico |
| `docs/generated/sprint-status.auto.md` | Sprints, burndown, tabla de tareas (generado) |
| `docs/generated/implementation-progress.auto.md` | Fases y componentes técnicos (generado) |
| `SPRINT-TRACKER.md` (raíz) | Vista humana del sprint — no lo sobrescribe `docs:sync` |

Regeneración: `npm run docs:sync` (ver [`AUTO-SYNC-DOCS-SETUP.md`](AUTO-SYNC-DOCS-SETUP.md)).

## Discord

Plantillas mínimas en `scripts/discord-notify.js` (webhook por env). No incluir secretos en el cuerpo del mensaje.
