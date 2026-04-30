#!/usr/bin/env bash
set -euo pipefail

# setup.sh — Configuración automática de n8n agents para Opsly
# Uso: ./n8n/setup.sh

echo "🚀 Configurando n8n agents para Opsly..."

# 1. Dar permisos de ejecución
echo "📝 Configurando permisos..."
chmod +x .n8n/n8n-import.sh
echo "   ✅ Permisos otorgados."

# 2. Verificar n8n CLI
echo "🔍 Verificando n8n CLI..."
if command -v n8n &>/dev/null; then
  VERSION=$(n8n --version 2>/dev/null || echo "unknown")
  echo "   ✅ n8n CLI: $VERSION"
else
  echo "   ⚠️  n8n CLI no encontrado. Instalar: npm install -g n8n"
fi

# 3. Verificar Docker (n8n corre en contenedores por tenant)
echo "🐳 Verificando Docker..."
if command -v docker &>/dev/null; then
  docker ps --format '{{.Names}}' | grep -q "n8n" && echo "   ✅ Contenedores n8n corriendo" || echo "   ⚠️  No hay contenedores n8n activos"
else
  echo "   ❌ Docker no encontrado"
fi

# 4. Verificar webhook URL
echo "🔗 Verificando webhook..."
N8N_URL="https://n8n-smiletripcare.ops.smiletripcare.com"
HTTP=$(curl -sk -o /dev/null -w "%{http_code}" "$N8N_URL/healthz" 2>/dev/null || echo "000")
if [[ "$HTTP" == "200" ]]; then
  echo "   ✅ n8n responde: $N8N_URL"
else
  echo "   ⚠️  n8n no responde ($HTTP). Verificar VPS."
fi

# 5. Verificar Doppler vars
echo "🔑 Verificando Doppler..."
if command -v doppler &>/dev/null; then
  doppler secrets get N8N_WEBHOOK_URL --plain --project ops-intcloudsysops --config prd >/dev/null 2>&1 \
    && echo "   ✅ N8N_WEBHOOK_URL en Doppler prd" \
    || echo "   ⚠️  N8N_WEBHOOK_URL faltante en Doppler prd"
else
  echo "   ⚠️  Doppler CLI no encontrado"
fi

# 6. Sincronizar contexto
echo "📄 Sincronizando contexto..."
if [[ -f "docs/ACTIVE-PROMPT.md" ]]; then
  cp docs/ACTIVE-PROMPT.md .n8n/2-context/ACTIVE-PROMPT.md 2>/dev/null || true
  echo "   ✅ ACTIVE-PROMPT sincronizado"
fi

if [[ -f "context/system_state.json" ]]; then
  cp context/system_state.json .n8n/2-context/system_state.json 2>/dev/null || true
  echo "   ✅ system_state.json sincronizado"
fi

echo ""
echo "✅ Configuración n8n completada."
echo ""
echo "📚 Próximos pasos:"
echo "   1. Importar workflow: ./.n8n/n8n-import.sh"
echo "   2. Ver workflows: https://n8n-smiletripcare.ops.smiletripcare.com"
echo "   3. Probar webhook: curl -X POST \$N8N_WEBHOOK_URL -d '{\"content\":\"# test\"}'"
echo ""
echo "🔗 Referencias:"
echo "   - AGENTS.md → sección 'Ecosistema IA — OpenClaw'"
echo "   - docs/n8n-workflows/discord-to-github.json"
echo "   - scripts/n8n-import.sh"
