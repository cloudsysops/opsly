# Flujo Git — Opsly (ramas limpias y PRs)

Objetivo: **una línea base (`main`) estable**, cambios integrados por **PR**, y pocas ramas huérfanas. Los agentes (Cursor, Claude, etc.) siguen el mismo orden que el equipo humano: **commit → push → PR → merge → borrar rama**.

## Reglas del equipo

1. **Antes de editar:** sincronizar el clon — ver [`SESSION-GIT-SYNC.md`](./SESSION-GIT-SYNC.md) (`./scripts/git-sync-repo.sh` o `git pull --ff-only`).
2. **Nueva capacidad o fix:** rama desde `main` actualizado:
   - `git fetch origin && git checkout main && git pull --ff-only origin main`
   - `git checkout -b feat/<tema-corto>` o `fix/<ticket>`.
3. **Integración:** **Pull Request** hacia `main`, CI verde, revisión cuando toque código de producto/infra.
4. **Tras merge:** borrar la rama en GitHub (recomendado: *Automatically delete head branches* en **Settings → General → Pull Requests**).
5. **No** hacer `git push --force` a `main`. **No** acumular semanas de trabajo en ramas `cursor/*` o `claude/*` sin integrar o archivar.
6. **Ramas de agente** (`cursor/…`, `claude/…`): **temporales**. Una rama = un tema; al terminar: PR o cierre explícito + borrado de rama (ver abajo).

## Flujo para agentes (orden fijo)

1. **Arranque:** `main` al día (`fetch` + `pull --ff-only`). Crear rama `feat/…` o `fix/…` (preferible a depender solo de `cursor/*` generadas por la herramienta: renombrar o abrir PR desde esa rama y tratarla como temporal).
2. **Commits:** mensajes [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`…), **un tema por commit** cuando sea posible. Pasar `npm run type-check` (y tests del workspace tocado) antes de push.
3. **Push:** `git push -u origin <rama>` una vez el conjunto esté listo para revisión (no pushes parciales que dejen CI rojo a propósito).
4. **PR:** abrir PR hacia `main`, descripción breve (qué / por qué / cómo validar). Marcar lista de verificación del template.
5. **Merge:** cuando CI y revisión estén OK — squash o merge commit según política del equipo; lo importante es **historia legible** y **rama borrada** al cerrar.
6. **Limpieza local:** `git fetch origin --prune` y `git checkout main && git pull --ff-only`; borrar rama local `git branch -d <rama>` si ya está mergeada.

Si varios agentes tocan el mismo tema, **una rama coordinada** o PRs encadenados (merge del primero y rebase del segundo sobre `main`), no muchas ramas divergentes sin merge.

## Cómo terminar ramas pendientes (checklist)

| Situación | Acción |
|-----------|--------|
| El trabajo **debe** entrar en producto | Rebase o merge de `main` en la rama, `push`, PR, merge, borrar rama remota. |
| El trabajo **ya está** en `main` (duplicado) | Cerrar PR con comentario *superseded by main* / archivo; `git push origin --delete <rama>`. |
| El trabajo **se abandona** | Cerrar PR con comentario breve; borrar rama remota; local `git branch -D <rama>` si upstream `gone`. |
| **Sin PR** pero rama remota vieja | Revisar con `git log origin/main..origin/<rama>`; luego borrar remota o abrir PR único desde `main` actualizado. |
| **Git worktree** (rama enlazada a otra carpeta) | No borrar la rama hasta `git worktree remove <path>`; luego `git branch -d <rama>`. |

Comandos útiles:

```bash
# Qué hay en GitHub abierto
gh pr list --state open

# Remotas ya absorbidas por main (candidatas a borrar en origin)
git fetch origin --prune
git branch -r --merged origin/main

# Remotas con commits que main aún no tiene
git branch -r --no-merged origin/main
```

## Auditoría local (sin borrar nada)

```bash
./scripts/git-branch-hygiene.sh
```

Opciones: `--no-fetch`, `--base origin/main` (u otra rama base).

Lista remotas **totalmente mergeadas** en la base (candidatas a borrar tras revisión humana), las **no mergeadas**, y locales con upstream **`[gone]`**.

## GitHub (recomendado)

- Proteger `main`: exigir PR, comprobar que pasen los checks requeridos.
- Activar **Automatically delete head branches** al cerrar PRs.
- Squash merge o merge commit según preferencia del equipo; lo importante es **una historia clara** y **no dejar ramas** colgando sin propósito.

## Cierre de sesión con solo `AGENTS.md` / espejos

Cuando el único cambio sea documentación de sesión (`AGENTS.md`, `.github/AGENTS.md`), el flujo documentado en `AGENTS.md` puede hacer **commit + push directo a `main`** si el equipo lo permite; para **código, infra o tests**, usar **PR** (ver también `docs/03-agents/AGENT-GUARDRAILS.md`).
