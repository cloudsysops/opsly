#!/bin/bash
# agent-startup.sh — Query inicial para que todo agente IA arrancque inteligente
# Uso: source scripts/agent-startup.sh  (NO executar, source para mantener variables)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "🤖 [Startup] Cargando contexto Opsly..."
echo ""

# 1. Verificar servicios
echo "1. Checking servicios..."
if curl -sf --max-time 5 http://localhost:3000/api/health >/dev/null 2>&1; then
    echo "  ✅ API: UP"
else
    echo "  ⚠️  API: DOWN (verificar con docker compose)"
fi

# 2. Cargar NotebookLM si está habilitado
if [[ "${NOTEBOOKLM_ENABLED:-false}" == "true" ]]; then
    echo ""
    echo "2. Consultando NotebookLM..."
    Q="Resume en 5 bullets: 1) Qué se decidió hoy, 2) Qué está bloqueado, 3) Qué es prioritario, 4) Qué optimizar, 5) Qué NO hacer. Basado en AGENTS.md, ROADMAP.md y docs/adr/"
    
    if node scripts/query-notebooklm.mjs "$Q" 2>/dev/null; then
        echo "  ✅ NotebookLM: OK"
    else
        echo "  ⚠️  NotebookLM: fallback a AGENTS.md"
        echo ""
        echo "=== AGENTS.md (último estado) ==="
        cat AGENTS.md | head -50
    fi
else
    echo "  ℹ️  NotebookLM: deshabilitado (NOTEBOOKLM_ENABLED=false)"
    echo ""
    echo "=== Estado rápido desde context/system_state.json ==="
    cat context/system_state.json | jq '{phase, vps: .vps.status, tenants: .tenants | length, knowledge: .knowledge_system.notebooklm.status}' 2>/dev/null || cat context/system_state.json | grep -E "phase|vps.status|tenants"
fi

echo ""
echo "3. Stack ML..."
if npm run type-check --workspace=@intcloudsysops/ml 2>/dev/null; then
    echo "  ✅ ML workspace: compilado"
else
    echo "  ⚠️  ML: revisar errores"
fi

echo ""
echo "4. Repos && Tenants..."
echo "  Apps: $(ls apps/ | tr '\n' ' ')"
echo "  Tenants: $(cat context/system_state.json | jq -r '.tenants[] .slug' 2>/dev/null | tr '\n' ' ')"

echo ""
echo "=== LISTO PARA TRABAJAR ==="
echo ""
echo "Próximos pasos:"
echo "  - Revisa AGENTS.md para estado de sesión"
echo "  - Si necesitas contexto profundo: node scripts/query-notebooklm.mjs"
echo "  - Para ML con GCP: config vars en Doppler"