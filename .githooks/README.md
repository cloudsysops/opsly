# Git hooks (opsly)

Este directorio se usa con `git config core.hooksPath .githooks` (lo aplica `scripts/git-setup.sh`).

- **pre-commit**: ejecuta `npm run type-check` en la raíz del monorepo para evitar commits que rompan TypeScript.

Para desactivar temporalmente un hook: `git commit --no-verify`.

Husky u otros gestores son opcionales; `core.hooksPath` evita dependencias npm extra para el hook básico.
