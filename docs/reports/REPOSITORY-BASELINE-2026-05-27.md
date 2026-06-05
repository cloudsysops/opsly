---
status: report
owner: operations
date: 2026-05-27
type: governance
---

# Repository Baseline — 2026-05-27

**Branch:** `chore/repository-guardian`  
**Scope:** governance enforcement only (no product/infra/client changes)

## PR #493 baseline

| Item | Estado |
|------|--------|
| PR | [#493](https://github.com/cloudsysops/opsly/pull/493) — `fix/git-hooks-lightweight` |
| Merge | **NO mergeado** (state: OPEN al 2026-05-27) |
| Acción | Cherry-pick `3a56dadb` sobre `origin/main` → commit `ab4558ec` en esta rama |
| Hooks reescritos | **No** — se adoptó el diff de #493 como baseline, sin reescritura adicional |

## Artefactos verificados

| Artefacto | Ruta | Estado |
|-----------|------|--------|
| Root whitelist SSOT | `config/root-whitelist.json` | ✅ Presente, JSON válido |
| Validador estructura | `scripts/validate-structure.js` | ⚠️ Baseline: solo `.md` en raíz + hubs `docs/` — **gap** → Fase 2 lo corrige |
| Guard staged | `scripts/hooks/structure-guard.sh` | ✅ Whitelist parcial staged; **gap** contaminación `.py`/imágenes → Fase 3 |
| Agent guardrails | `docs/03-agents/AGENT-GUARDRAILS.md` | ✅ Referencia whitelist + validate-structure |
| Structure guardrails | `docs/STRUCTURE-GUARDRAILS.md` | ✅ Hubs `docs/`, validación npm |
| Hooks doc | `docs/00-architecture/hooks-system.md` | ✅ Describe pre-commit/pre-push; alinear con lightweight pattern post-#493 |

## Symlinks documentados en raíz

| Nombre | Destino | Whitelist |
|--------|---------|-----------|
| `context` | `runtime/context` | `allowed_folders` |
| `skills` | `packages/skills` | `allowed_folders` |

## Gaps identificados (pre-hardening)

1. `validate-structure.js` no leía `root-whitelist.json` completo (solo markdown hardcoded).
2. Contaminación local en raíz (`.py`, imágenes) no bloqueada en staged.
3. Entradas gitignored (`.env*`, `dump.rdb`) correctamente omitidas en validación full-tree.

## Veredicto baseline

**READY FOR GOVERNANCE HARDENING**

Prerrequisito PR #493 documentado; baseline de hooks incorporado vía cherry-pick sin reescritura.
