#!/usr/bin/env bash
set -euo pipefail

# post-merge.sh — Reinstalar dependencias si cambió package-lock.json
# Uso: post-merge hook de git

echo "🔄 Ejecutando post-merge hook..."

# Verificar si package-lock.json cambió en el último merge
if git diff-tree --no-commit-id -r HEAD@{1} HEAD --name-only 2>/dev/null | grep -q "package-lock.json"; then
  echo "📦 package-lock.json cambió. Reinstalando dependencias..."
  
  # Detectar si es monorepo con workspaces
  if [[ -f "package.json" ]] && grep -q '"workspaces"' package.json; then
    echo "   Monorepo detectado. Ejecutando npm ci..."
    npm ci
  else
    echo "   Proyecto simple. Ejecutando npm ci..."
    npm ci
  fi
  
  if [[ $? -eq 0 ]]; then
    echo "✅ Dependencias reinstaladas correctamente."
  else
    echo "❌ Error al reinstalar dependencias."
    exit 1
  fi
else
  echo "✅ package-lock.json no cambió. No se requiere reinstalación."
fi

# Verificar si hay migraciones nuevas de Supabase
if git diff-tree --no-commit-id -r HEAD@{1} HEAD --name-only 2>/dev/null | grep -q "supabase/migrations/"; then
  echo "🗄️  Migraciones de Supabase detectadas."
  echo "   Recuerda ejecutar: npx supabase db push"
fi

# Verificar si cambiaron archivos del orchestrator
if git diff-tree --no-commit-id -r HEAD@{1} HEAD --name-only 2>/dev/null | grep -q "apps/orchestrator/"; then
  echo "🤖 Cambios en orchestrator detectados."
  echo "   Recuerda reconstruir imágenes si es necesario."
fi

echo "✅ Post-merge hook completado."
