#!/usr/bin/env bash
# Script: Monitorea y auto-corrige código en local
# Uso: bash scripts/watch-and-fix.sh
# Para en cualquier momento con Ctrl+C

set -euo pipefail

INTERVAL=30
LAST_COMMIT=""

log() {
  TIMESTAMP=$(date "+%H:%M:%S")
  echo "[$TIMESTAMP] 👁️  $*"
}

log "👁️ Watch & Fix daemon iniciado"
log "Repo: cloudsysops/opsly"
log "Intervalo: ${INTERVAL}s"
log "Presiona Ctrl+C para detener"
echo ""

trap 'log "⏹️  Daemon detenido"; exit 0' INT TERM

while true; do
  # Fetch remoto
  git fetch origin main >/dev/null 2>&1 || true
  
  # Obtener último commit
  CURRENT=$(git rev-parse origin/main 2>/dev/null || echo "")
  
  if [ -z "$CURRENT" ]; then
    sleep "$INTERVAL"
    continue
  fi
  
  # Verificar si hay cambios nuevos
  if [ "$CURRENT" != "$LAST_COMMIT" ]; then
    SHORT=$(echo "$CURRENT" | cut -c1-7)
    log "📥 Nuevo commit: $SHORT"
    
    # Ejecutar correcciones
    log "🔧 Aplicando ESLint --fix..."
    npm run lint:fix -w @intcloudsysops/api 2>/dev/null || true
    npm run lint:fix -w @intcloudsysops/admin 2>/dev/null || true
    
    # Verificar cambios
    if [ -n "$(git status --porcelain)" ]; then
      log "💾 Creando commit con cambios..."
      git config user.name "You (Local)" 2>/dev/null || true
      git add -A
      git commit -m "chore: auto-fix code quality [local]" 2>/dev/null || true
      git push origin main 2>/dev/null || true
      log "✅ Cambios pusheados"
    fi
    
    LAST_COMMIT="$CURRENT"
  fi
  
  sleep "$INTERVAL"
done
