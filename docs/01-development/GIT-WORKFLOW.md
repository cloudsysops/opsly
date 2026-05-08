# Flujo Git — Opsly (ramas limpias y PRs)

Objetivo: **una línea base (`main`) estable**, cambios integrados por **PR**, y pocas ramas huérfanas. Los agentes (Cursor, Claude, etc.) siguen el mismo orden que el equipo humano: **commit → push → PR → merge → borrar rama**.

## Ramas fijas + prefijos por módulo

La convención queda separada en **ramas fijas reales** (larga vida, protegidas) y **prefijos fijos por módulo** (namespaces para ramas temporales de agentes). Esto evita un problema de Git: si existe una rama `module/api`, no puede existir otra rama `module/api/<cambio>` porque ambas compiten por el mismo ref.

### Ramas fijas reales (ambiente)

| Rama fija | Rol | Deploy automático | Quién mergea | Regla |
| --------- | --- | ----------------- | ------------ | ----- |
| `main` | Producción estable | Sí: producción (`:latest`) | Owner/revisor | Solo PR desde `staging` o hotfix aprobado. |
| `staging` | Integración pre-prod | Sí: staging (`:staging`) | Revisor de integración | Recibe PRs desde ramas temporales `module/<modulo>/<tipo>/<fecha>-<tema>` o hotfixes. |

> No crear `develop`: `staging` cumple ese rol y ya está conectado al workflow de deploy del VPS.

### Prefijos fijos por módulo (no son ramas persistentes)

Estos prefijos ordenan el trabajo por dominio. **No crear ramas padre** como `module/api` o `module/portal`; los agentes crean una rama completa por cambio dentro del prefijo.

| Prefijo | Ámbito principal | Rutas típicas |
| ------- | ---------------- | ------------- |
| `module/api/` | API control plane y rutas Next API | `apps/api/**`, `docs/openapi-opsly-api.yaml` |
| `module/admin/` | Dashboard admin | `apps/admin/**` |
| `module/portal/` | Portal tenant | `apps/portal/**` |
| `module/orchestrator/` | Orchestrator, workers, OAR | `apps/orchestrator/**`, `docs/00-architecture/ORCHESTRATOR.md` |
| `module/llm/` | LLM Gateway, OpenClaw/IA | `apps/llm-gateway/**`, `docs/00-architecture/LLM-GATEWAY.md` |
| `module/mcp/` | MCP tools/server | `apps/mcp/**` |
| `module/infra/` | Docker, VPS, CI/CD, scripts infra | `infra/**`, `.github/workflows/**`, `scripts/**`, `docs/04-infrastructure/**` |
| `module/billing/` | Stripe, costos, metering | `apps/api/**/billing*`, `apps/admin/**/costs*`, docs billing |
| `module/tenant/` | Onboarding/lifecycle tenant | rutas tenant, scripts provisioning, runbooks tenant |
| `module/docs/` | Documentación, AGENTS, knowledge index | `AGENTS.md`, `docs/**`, `config/knowledge-index.json` |
| `module/skills/` | Skills de agentes | `packages/skills/**`, `skills/**` |

### Ramas temporales de agentes

Formato obligatorio:

```text
module/<modulo>/<tipo>/<YYYYMMDD>-<tema-corto>
```

- `modulo`: uno de `api`, `admin`, `portal`, `orchestrator`, `llm`, `mcp`, `infra`, `billing`, `tenant`, `docs`, `skills`.
- `tipo`: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `hotfix`.
- Ejemplos: `module/portal/feat/20260508-usage-card`, `module/api/fix/20260508-feedback-auth`, `module/infra/docs/20260508-vps-runbook`.

### Cadena de promoción

```text
module/<modulo>/<tipo>/<fecha>-<tema>
  → staging
  → main
```

Reglas:

1. El agente crea su rama temporal desde `origin/staging` actualizado. Si es `hotfix`, sale desde `origin/main`.
2. Una tarea que toca varios módulos debe elegir **un módulo owner** para el prefijo y mencionar módulos secundarios en el PR. Si el cambio es grande, dividir en PRs por módulo.
3. Las ramas `module/<modulo>/<tipo>/<fecha>-<tema>` son temporales: una rama = un cambio o ticket.
4. `hotfix` entra primero a `main` y luego se retropropaga a `staging`.
5. Tras mergear una rama temporal, borrar rama remota y local. Las únicas ramas persistentes son `main` y `staging`.

### Bootstrap inicial de ramas fijas

Cuando el owner decida materializarlas en GitHub:

```bash
./scripts/create-fixed-branches.sh --push
```

El script crea/pushea solo `staging`. Los prefijos `module/<modulo>/...` aparecen cuando cada agente crea una rama temporal concreta.

Después, configurar protección de ramas en GitHub para `main` y `staging` (PR requerido, checks requeridos, sin force-push).


## Reglas del equipo

1. **Antes de editar:** sincronizar el clon — ver [`SESSION-GIT-SYNC.md`](./SESSION-GIT-SYNC.md) (`./scripts/git-sync-repo.sh` o `git pull --ff-only`).
2. **Nueva capacidad o fix:** rama temporal desde `staging` actualizado:
   - `git fetch origin && git checkout staging && git pull --ff-only origin staging`
   - `git checkout -b module/<modulo>/<tipo>/<YYYYMMDD>-<tema-corto>`.
   - Si es hotfix productivo: partir desde `main` con `module/<modulo>/hotfix/<YYYYMMDD>-<tema>`.
3. **Integración:** **Pull Request** hacia `staging`; después promoción `staging` → `main` con CI verde.
4. **Tras merge:** borrar la rama en GitHub (recomendado: *Automatically delete head branches* en **Settings → General → Pull Requests**).
5. **No** hacer `git push --force` a `main`. **No** acumular semanas de trabajo en ramas `cursor/*` o `claude/*` sin integrar o archivar.
6. **Ramas de agente** (`cursor/…`, `claude/…`): **temporales**. Una rama = un tema; al terminar: PR o cierre explícito + borrado de rama (ver abajo).

## Flujo para agentes (orden fijo)

1. **Arranque:** `staging` al día (`fetch` + `pull --ff-only`). Crear rama temporal `module/<modulo>/<tipo>/<YYYYMMDD>-<tema>` (preferible a depender solo de `cursor/*` generadas por la herramienta: renombrar o abrir PR desde esa rama y tratarla como temporal).
2. **Commits:** mensajes [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`…), **un tema por commit** cuando sea posible. Pasar `npm run type-check` (y tests del workspace tocado) antes de push.
3. **Push:** `git push -u origin <rama>` una vez el conjunto esté listo para revisión (no pushes parciales que dejen CI rojo a propósito).
4. **PR:** abrir PR hacia `staging`, descripción breve (qué / por qué / cómo validar). Para producción, abrir PR `staging` → `main`.
5. **Merge:** cuando CI y revisión estén OK — squash o merge commit según política del equipo; lo importante es **historia legible** y **rama borrada** al cerrar.
6. **Limpieza local:** `git fetch origin --prune` y `git checkout main && git pull --ff-only`; borrar rama local `git branch -d <rama>` si ya está mergeada.

Si varios agentes tocan el mismo tema, **una rama coordinada** o PRs encadenados (merge del primero y rebase del segundo sobre `main`), no muchas ramas divergentes sin merge.

## Cómo terminar ramas pendientes (checklist)

| Situación | Acción |
|-----------|--------|
| El trabajo **debe** entrar en producto | Rebase o merge de `staging` (o `main` si es hotfix) en la rama, `push`, PR, merge, borrar rama temporal. |
| El trabajo **ya está** en `main` (duplicado) | Cerrar PR con comentario *superseded by main* / archivo; `git push origin --delete <rama>`. |
| El trabajo **se abandona** | Cerrar PR con comentario breve; borrar rama remota; local `git branch -D <rama>` si upstream `gone`. |
| **Sin PR** pero rama remota vieja | Revisar con `git log origin/main..origin/<rama>`; luego borrar remota o abrir PR único desde `main` actualizado. |
| **Git worktree** (rama enlazada a otra carpeta) | No borrar la rama hasta `git worktree remove <path>`; luego `git branch -d <rama>`. |

Comandos útiles:

```bash
# Qué hay en GitHub abierto
gh pr list --state open

# Remotas ya absorbidas por main (candidatas a borrar si NO son ramas fijas)
git fetch origin --prune
git branch -r --merged origin/main

# Remotas con commits que main aún no tiene
git branch -r --no-merged origin/main
```

## Checklist paralelo (GitHub + clon)

Objetivo: en **una pasada corta** (varios terminales o agentes en paralelo) comprobar que **GitHub** no tenga PRs ni ramas colgantes y que el **clon** quede alineado a `main`.

| Canal | Comando | Listo cuando… |
|-------|---------|----------------|
| **PRs** | `gh pr list --state open` | No quedan PRs abiertos que deban mergearse o cerrarse con comentario. |
| **Ramas remotas** | `git fetch origin --prune` y `git branch -r` | Solo ramas fijas (`origin/main`, `origin/staging`) y ramas temporales `origin/module/<modulo>/<tipo>/<fecha>-<tema>` con PR abierto; borrar lo demás. |
| **Ramas locales** | `./scripts/git-branch-hygiene.sh` | Sin remotas mergeadas basura; sin locales `[gone]` sin resolver. |
| **Worktrees** | `git worktree list` y en cada ruta `git status -sb` | Árbol limpio; si el contexto ya no aplica: `git worktree remove <path>` antes de borrar la rama. |
| **Stash** | `git stash list` | Revisión humana; **no** purgar en automático (`drop`/`clear` solo tras confirmar). |

Si corrés todo en paralelo, sincronizá resultados en un solo lugar (p. ej. comentario en issue interno o línea en `AGENTS.md` al cierre de sesión).

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
