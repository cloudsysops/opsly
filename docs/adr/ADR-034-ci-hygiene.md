# ADR-034: CI Hygiene Policy

**Status:** APPROVED
**Date:** 2026-04-24
**Relates to:** ADR-033 (docs canonicalization)

## Context

Tras mergear ADR-033 se identificaron 3 problemas de CI que afectan la calidad de la señal:

1. `@rollup/rollup-linux-x64-gnu` requería install manual en cada job por [bug conocido de npm con optional dependencies](https://github.com/npm/tools/cli/issues/4828).
2. Duplicación de `AGENTS.md` en `.github/AGENTS.md` sin mecanismo claro de autoridad.
3. Múltiples checks fallan por falta de secretos (Doppler, LLM keys) → PRs se mergean rutinariamente con `--admin`, degradando la señal.

## Decisions

### Rollup optional dependencies

Fijar en `package.json` raíz:

```json
"optionalDependencies": {
  "@rollup/rollup-linux-x64-gnu": "4.60.2",
  "@rollup/rollup-darwin-arm64": "4.60.2",
  "@rollup/rollup-darwin-x64": "4.60.2"
},
"overrides": {
  "rollup": "4.60.2"
}
```

Workflows usan `npm ci` estándar; no más installs ad-hoc de Rollup en YAML.

### `.github/AGENTS.md`

**Opción B elegida:** `.github/AGENTS.md` es un **symlink** a `../AGENTS.md` (misma ruta lógica que `AGENTS.md` en la raíz). Una sola fuente de verdad; `scripts/update-agents.sh` y `.githooks/post-commit` ya no copian contenido a `.github/AGENTS.md` (evita sustituir el symlink por un fichero regular).

`validate-context` comprueba que el symlink apunte a `../AGENTS.md` o, en transición, que el contenido coincida.

GitHub y herramientas que lean `.github/AGENTS.md` resuelven el symlink al contenido de `AGENTS.md`. **Nota (Windows):** `core.symlinks` debe permitir symlinks; si el checkout materializa un archivo de texto, repetir el `ln -s` o clonar con symlinks activados.

### Shellcheck severity

`shellcheck -S error` es la política actual. Warnings nivel `style|info|warning` se documentan como deuda técnica, se irán arreglando en batch en futuros PRs. No se bloquean merges por warnings no-error.

### PRs de solo-docs

PRs que solo modifican `.md` pueden mergearse con `--admin` si los checks fallidos son:

- `npm audit` (a menos que el cambio toque deps)
- `validate-doppler` (requiere secretos no presentes en PRs externos)
- `test`/`build`/`e2e` que requieran LLM keys o secretos de plataforma

El check `docs-governance` (ADR-033) **NUNCA** puede saltarse.

## Consequences

**Positive:**

- CI estándar sin workarounds de Rollup en workflows
- Un `AGENTS.md` canónico en el root, expuesto también vía `.github/AGENTS.md` sin duplicar bytes
- Política de merge explícita, no implícita

**Trade-offs:**

- Deuda técnica de shellcheck warnings sigue presente (visible, no resuelta)
- Checks que requieren secretos quedan informativos hasta que GitHub Actions tenga los secrets configurados

## Future work

- Agregar secrets a GitHub Actions para que `validate-doppler`, `test`, `e2e` puedan correr en PRs de feature
- Batch de shellcheck warnings → subir severidad a `-S warning` después del cleanup
- Revisar `npm audit` findings caso por caso
