# Flujo Git — Opsly (ramas limpias y PRs)

Objetivo: **una línea base (`main`) estable**, cambios integrados por **PR**, y pocas ramas huérfanas.

## Reglas del equipo

1. **Antes de editar:** sincronizar el clon — ver [`SESSION-GIT-SYNC.md`](./SESSION-GIT-SYNC.md) (`./scripts/git-sync-repo.sh` o `git pull --ff-only`).
2. **Nueva capacidad o fix:** rama desde `main` actualizado:
   - `git fetch origin && git checkout -b feat/<tema-corto>` o `fix/<ticket>`.
3. **Integración:** **Pull Request** hacia `main`, CI verde, revisión cuando toque código de producto/infra.
4. **Tras merge:** borrar la rama en GitHub (activar *Automatically delete head branches* en repo Settings → General → Pull Requests).
5. **No** hacer `git push --force` a `main`. **No** acumular semanas de trabajo en ramas `cursor/*` sin rebasar o fusionar con `main`.
6. **Ramas de agente** (`cursor/…`, `claude/…`): tratarlas como **temporales**; o se convierten en PR, o se archivan/borran cuando el trabajo ya está en `main` o se abandona.

## Auditoría local (sin borrar nada)

```bash
./scripts/git-branch-hygiene.sh
```

Opciones: `--no-fetch`, `--base origin/main` (u otra rama base).

El script lista remotas **totalmente mergeadas** en `main` (candidatas a borrar tras revisión humana) y la **divergencia** del resto.

## GitHub (recomendado)

- Proteger `main`: exigir PR, comprobar que pasen los checks requeridos.
- Squash merge o merge commit según preferencia del equipo; lo importante es **una historia clara** y **borrar ramas** al cerrar el PR.

## Cierre de sesión con solo `AGENTS.md` / espejos

Cuando el único cambio sea documentación de sesión (`AGENTS.md`, `.github/AGENTS.md`), el flujo documentado en `AGENTS.md` puede hacer **commit + push directo a `main`** si el equipo lo permite; para código o infra, usar **PR**.
