---
status: draft
owner: operations
last_review: 2026-09-11
type: guide
tags:
  - opsly/git
  - opsly/agents
---

# Convención de worktrees — agentes en paralelo sin colisión

Objetivo: **varios agentes (Cursor, Claude, Codex, OpenCode, Hermes) editan el
monorepo a la vez** sin pisarse, sin duplicar trabajo y sin dejar worktrees
huérfanos. Complementa [`01-development/GIT-WORKFLOW.md`](../01-development/GIT-WORKFLOW.md)
— este doc es **solo** la mecánica de *dónde vive cada trabajo*.

> La regla dura sigue siendo la de `GIT-WORKFLOW.md`: **una sesión = una rama y
> un tema dominante**. Esto convierte esa regla en una convención de directorios
> y nombres que cualquier agente puede seguir solo.

---

## Principio rector

**1 worktree = 1 agente (dueño) + 1 tema.** Nadie abre un segundo worktree para
el mismo tema; si el tema ya tiene dueño, se coordina con él (o se encola el
trabajo en `docs/01-development/AGENT-PROMPT-QUEUE.md` con su `agent_hint`).

## Dónde

Centralizar todo bajo una sola raíz, **no** esparcir en `/private/tmp/`:

```
.worktrees/
  <agente>/
    <tema>/            # git worktree, rama feat/<tema> o fix/<tema>
```

Ejemplos:

```
.worktrees/cursor/agent-lab-reconcile/
.worktrees/claude/content-review/
.worktrees/codex/trust-gate-audit/
.worktrees/opencode/peskids-oom/
```

`git worktree add` ya crea la carpeta; la convención solo fija **dónde** y
**con qué nombre**:

```bash
git worktree add .worktrees/<agente>/<tema> -b <feat|fix>/<tema>
```

La propia herramienta (`Cursor`, `Claude Code`) puede abrir worktrees en
`/private/tmp/` o `.claude/worktrees/` por defecto; al terminar, mover o
re-basar el trabajo a `.worktrees/` y publicar PR antes de perder el rastro.

## Naming

| Componente | Regla | Ejemplo |
| --- | --- | --- |
| `agente` | nombre corto del dueño primario, en minúsculas | `cursor`, `claude`, `codex`, `opencode`, `hermes` |
| `tema` | kebab-case, un sustantivo de **capacidad**, no un ticket suelto | `content-review`, no `pr-1194` |
| rama | prefijo `feat/` (capacidad) o `fix/` (defecto) + mismo `<tema>` | `feat/content-review` |

Regla: si dos agentes colaboran sobre el mismo tema, **una sola rama**, no dos
ramas paralelas. El segundo rebasa el PR del primero sobre `main` (PRs
encadenados), nunca abre un fork del mismo trabajo.

## Ciclo de vida (obligatorio, orden fijo)

1. **Antes de abrir algo**: `git fetch origin && git pull --ff-only origin main`.
2. **Comprobar ownership** (en este orden):
   1. `config/<capacidad>-capabilities.json` o el owner canónico → ¿ya existe un
      dueño para esta capability? Extender, no duplicar.
   2. `docs/01-development/AGENT-PROMPT-QUEUE.md` → ¿la tarea ya tiene
      `agent_hint`? Respétalo.
   3. `git worktree list` + `gh pr list` → ¿ya hay worktree/PR para este tema?
      Coordinarse, no abrir otro.
3. **Trabajar** en `.worktrees/<agente>/<tema>/`, rama `<feat|fix>/<tema>`.
4. **Cerrar**: commit **con hooks** → `git push -u origin <rama>` → `gh pr create`
   → merge → `git worktree remove` → `git branch -d <rama>` (y borrar remota).
5. **Si se abandona/duplica**: cerrar PR con `superseded by main`, borrar rama
   remota, `git worktree remove`. No dejar worktree colgando.

## Anti-colisión (checklist del agente al arrancar)

```bash
git worktree list                          # qué hay ya abierto
gh pr list --state open                    # qué PRs hay abiertos
git branch -r --no-merged origin/main      # ramas sin integrar
```

O el mismo checklist en un solo comando (solo lectura, no borra nada):

```bash
./scripts/check-worktree-convention.sh          # reporte
./scripts/check-worktree-convention.sh --strict # exit 1 si hay worktrees fuera de .worktrees/<agente>/<tema>/
```

Si el tema ya aparece → **no abrir**. Encajar en el flujo existente.

**Estado real (2026-09-14):** el checklist detectó 15 worktrees activos fuera de
`.worktrees/<agente>/<tema>/` (`.codex/worktrees/*`, `.git/worktrees-tmp/*`,
`opsly-worktrees/*`, carpetas `-wt` sueltas). La convención no se está
cumpliendo todavía — no se migran automáticamente; cada dueño reubica el suyo
al cerrar su tema, o se documenta la excepción aquí.

## Limpieza segura (no manual)

No borrar ramas/worktrees a mano. Usar:

```bash
./scripts/git-branch-hygiene.sh            # auditoría (no borra)
./scripts/git-branch-cleanup.sh            # archivo + limpieza segura
```

## Preservación entre máquinas

La regla de `GIT-WORKFLOW.md` § "Preservación de trabajo entre máquinas" aplica a
**cada worktree**: inventariar `máquina | worktree | rama | SHA local | SHA remoto
verificado | PR | pendientes` antes de cerrar, cambiar de rama o clonar. Un commit
local no es respaldo; verificar push real.

---

## Enlaces relacionados

- [[01-development/GIT-WORKFLOW|Flujo Git]]
- [[03-agents/PARALLEL-AGENTS-ORCHESTRATION|Orquestación en paralelo (runtime)]]
- [[03-agents/AGENT-ROUTING|Ruteo por agente]]