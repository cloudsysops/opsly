#!/usr/bin/env bash
set -euo pipefail

# auto-commit.sh — Auto-commit con validaciones
# Uso: llamado como hook post-commit o pre-commit

# Evitar commit directo en main
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

if [[ "$CURRENT_BRANCH" == "main" ]]; then
  echo "❌ ERROR: No se permite commit directo en main."
  echo "   Crea una rama: git checkout -b feat/mi-cambio"
  exit 1
fi

# Ejecutar npm run verify si existe
if grep -q '"verify"' package.json 2>/dev/null; then
  echo "🔍 Ejecutando npm run verify..."
  npm run verify
  if [[ $? -ne 0 ]]; then
    echo "❌ npm run verify falló. Arregla los errores antes de commitear."
    exit 1
  fi
fi

# Auto-commit message (si se llama desde script)
if [[ $# -gt 0 ]]; then
  COMMIT_MSG="$1"
else
  # Generar mensaje conventional automático basado en archivos cambiados
  CHANGED_FILES=$(git diff --cached --name-only 2>/dev/null || true)
  
  if [[ -z "$CHANGED_FILES" ]]; then
    echo "⚠️  No hay archivos staged para commit."
    exit 0
  fi
  
  # Determinar tipo de commit basado en archivos
  if echo "$CHANGED_FILES" | grep -q "apps/api/"; then
    TYPE="feat(api)"
  elif echo "$CHANGED_FILES" | grep -q "apps/admin/\|apps/portal/"; then
    TYPE="feat(ui)"
  elif echo "$CHANGED_FILES" | grep -q "apps/orchestrator/\|apps/llm-gateway/"; then
    TYPE="feat(agents)"
  elif echo "$CHANGED_FILES" | grep -q "scripts/"; then
    TYPE="chore(deps)"
  elif echo "$CHANGED_FILES" | grep -q "docs/\|CLAUDE.md\|AGENTS.md"; then
    TYPE="docs"
  elif echo "$CHANGED_FILES" | grep -q "infra/\|docker"; then
    TYPE="chore(infra)"
  else
    TYPE="chore"
  fi
  
  COMMIT_MSG="$TYPE: actualización automática $(date +%Y-%m-%d)"
fi

# Verificar que no hay secretos expuestos (básico)
if git diff --cached | grep -E "(API_KEY|SECRET|PASSWORD|TOKEN).*="; then
  echo "❌ ERROR: Posible secreto expuesto detectado en diff."
  echo "   Revisa los cambios antes de commitear."
  exit 1
fi

echo "✅ Auto-commit: $COMMIT_MSG"
git commit -m "$COMMIT_MSG"

# Sync mirrors si es necesario
if [[ -f scripts/update-agents.sh ]]; then
  bash scripts/update-agents.sh
fi
