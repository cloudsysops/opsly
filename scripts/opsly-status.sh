#!/bin/bash
# opsly-status.sh — Estado rápido del sistema
# Uso: ./scripts/opsly-status.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

echo "╔══════════════════════════════════════════════════════╗"
echo "║         🚀 OPSLY STATUS $(date '+%Y-%m-%d %H:%M')          ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

echo "📦 Servicios Docker:"
docker compose -f infra/docker-compose.platform.yml ps --format "table {{.Name}}\t{{.Status}}" 2>/dev/null | grep -E "opsly|infra" | while read line; do
  if echo "$line" | grep -q "healthy\|Up"; then
    echo "  ✅ $line"
  else
    echo "  ❌ $line"
  fi
done

echo ""
echo "🔧 TypeCheck:"
if npm run type-check 2>&1 | tail -3 | grep -q "successful"; then
  echo "  ✅ ALL COMPILAN"
else
  echo "  ⚠️  VERIFICAR"
fi

echo ""
echo "🎯 Tenants Activos:"
cat context/system_state.json | jq -r '.tenants[] | "  - \(.slug): \(.status)"' 2>/dev/null || echo "  (verificar system_state.json)"

echo ""
echo "🧠 NotebookLM:"
if [[ "${NOTEBOOKLM_ENABLED:-false}" == "true" ]]; then
  echo "  ✅ HABILITADO"
  echo "  📝 $(cat context/system_state.json | jq -r '.knowledge_system.notebooklm.notebook_id' 2>/dev/null)"
else
  echo "  ⚠️  Deshabilitado"
fi

echo ""
echo "☁️ GCP ML:"
missing=$(cat context/system_state.json | jq -r '.doppler.missing[]' 2>/dev/null | tr '\n' ' ')
if [[ -z "$missing" ]]; then
  echo "  ✅ COMPLETO"
else
  echo "  ⚠️  Faltan: $missing"
fi

echo ""
echo "📊 Git:"
echo "  Branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
echo "  Last:   $(git log -1 --oneline 2>/dev/null | cut -d' ' -f1-3)"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "   Sistema OPERATIVO Listo paraTrabajar"
echo "═══════════════════════════════════════════════════════"