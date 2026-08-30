#!/bin/bash
# agent-startup.sh — Query inicial para que todo agente IA arrancque inteligente
# Uso: source scripts/agent-startup.sh  (NO executar, source para mantener variables)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "🤖 [Startup] Cargando contexto Opsly..."
echo ""

# 1. Rama y tema
echo "1. Rama y tema..."
if [[ -x "$REPO_ROOT/scripts/git-session-brief.sh" ]]; then
    bash "$REPO_ROOT/scripts/git-session-brief.sh" || true
else
    echo "  ⚠️  session brief no disponible"
fi

echo ""

# 2. Verificar servicios
echo "2. Checking servicios..."
if curl -sf --max-time 5 http://localhost:3000/api/health >/dev/null 2>&1; then
    echo "  ✅ API: UP"
else
    echo "  ⚠️  API: DOWN (verificar con docker compose)"
fi

# 3. Cargar NotebookLM si está habilitado
if [[ "${NOTEBOOKLM_ENABLED:-false}" == "true" ]]; then
    echo ""
    echo "3. Consultando NotebookLM..."
    STARTUP_PROMPT_FILE="docs/03-agents/AGENT-STARTUP-PROMPT.md"
    if [[ -f "$STARTUP_PROMPT_FILE" ]]; then
        Q="$(cat "$STARTUP_PROMPT_FILE" | sed -n '/^```text$/,/^```$/p' | sed '1d;$d')"
    else
        Q="Resume el estado actual de Opsly en 5 bullets: 1) qué está funcionando, 2) qué está bloqueado, 3) qué patrones de agentes conviene cargar primero, 4) qué no hay que hacer, 5) qué vertical o tenant está más cerca de monetización. Prioriza AGENTS.md, VISION.md, AGENT-BRAIN-CONTRACT, Brain Dashboard, Agent Pattern Matrix y NotebookLM."
    fi
    
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
echo "4. Stack ML..."
if npm run type-check --workspace=@intcloudsysops/ml 2>/dev/null; then
    echo "  ✅ ML workspace: compilado"
else
    echo "  ⚠️  ML: revisar errores"
fi

echo ""
echo "5. Repos && Tenants..."
echo "  Apps: $(ls apps/ | tr '\n' ' ')"
echo "  Tenants: $(cat context/system_state.json | jq -r '.tenants[] .slug' 2>/dev/null | tr '\n' ' ')"

echo ""
echo "=== LISTO PARA TRABAJAR ==="
echo ""
if [[ -x "$REPO_ROOT/scripts/opsly-local-blindaje-check.sh" ]]; then
  echo "6. Blindaje local (agentes / ACTIVE-PROMPT)..."
  if [[ "${OPSLY_ACTIVE_PROMPT_WRITES_DISABLED:-}" != "1" ]]; then
    echo "  ⚠️  export OPSLY_ACTIVE_PROMPT_WRITES_DISABLED=1  # recomendado en Mac/Cursor"
  fi
  if [[ "${OPSLY_CLI_AGENT_DRY_RUN:-}" != "1" ]]; then
    echo "  ⚠️  export OPSLY_CLI_AGENT_DRY_RUN=1  # evita ejecutar CLIs reales"
  fi
  bash "$REPO_ROOT/scripts/opsly-local-blindaje-check.sh" || true
  echo ""
fi
echo "Próximos pasos:"
echo "  - Revisa AGENTS.md para estado de sesión"
echo "  - Revisa docs/03-agents/AGENT-STARTUP-PROMPT.md para el orden de arranque"
echo "  - Si necesitas contexto profundo: node scripts/query-notebooklm.mjs"
echo "  - Para ML con GCP: config vars en Doppler"
