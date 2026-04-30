#!/usr/bin/env bash
set -euo pipefail

# lint-on-save.sh — Lint en archivos staged (lint-staged)
# Uso: pre-commit hook para linting rápido

echo "🔍 Ejecutando lint en archivos staged..."

# Obtener archivos staged (solo .ts, .tsx, .js)
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js)$' || true)

if [[ -z "$STAGED_FILES" ]]; then
  echo "✅ No hay archivos TypeScript/JavaScript staged para lint."
  exit 0
fi

# Filtrar solo archivos en apps/api/app y apps/api/lib (regla de AGENTS.md)
API_FILES=$(echo "$STAGED_FILES" | grep -E "^(apps/api/app|apps/api/lib)/" || true)

if [[ -z "$API_FILES" ]]; then
  echo "✅ No hay archivos de API staged (lint estricto solo para apps/api)."
  exit 0
fi

echo "📝 Archivos a lintar (API):"
echo "$API_FILES"

# Ejecutar ESLint con max-warnings 0 en archivos de API
echo "$API_FILES" | xargs npx eslint --max-warnings 0
ESLINT_EXIT=$?

if [[ $ESLINT_EXIT -ne 0 ]]; then
  echo "❌ ESLint falló. Corrige los errores antes de commitear."
  exit 1
fi

echo "✅ Lint passed para archivos de API."
