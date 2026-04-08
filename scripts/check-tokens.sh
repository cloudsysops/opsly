#!/usr/bin/env bash
# check-tokens.sh — Verifica tokens en Doppler prd sin mostrar valores
set -euo pipefail

log()  { echo "[check-tokens] $*"; }
ok()   { echo "[check-tokens] ✅ $1 ($2 chars)"; }
fail() { echo "[check-tokens] ❌ $1 — falta o placeholder"; }

log "Verificando tokens en Doppler ops-intcloudsysops/prd..."
echo ""

MISSING=0

for VAR in \
  ANTHROPIC_API_KEY \
  GITHUB_TOKEN_N8N \
  RESEND_API_KEY \
  PLATFORM_ADMIN_TOKEN \
  DISCORD_WEBHOOK_URL \
  GOOGLE_DRIVE_TOKEN \
  MCP_JWT_SECRET \
  OPENROUTER_API_KEY \
  OPENAI_API_KEY; do

  VAL=$(doppler secrets get "$VAR" \
    --project ops-intcloudsysops --config prd \
    --plain 2>/dev/null || echo "")
  LEN=${#VAL}

  if [[ $LEN -gt 20 ]]; then
    ok "$VAR" "$LEN"
  else
    fail "$VAR"
    ((MISSING++)) || true
  fi
done

# Verificar Ollama si está configurado
OLLAMA_URL=$(doppler secrets get OLLAMA_URL \
  --project ops-intcloudsysops --config prd \
  --plain 2>/dev/null || echo "")
if [[ -n "$OLLAMA_URL" ]]; then
  HTTP=$(curl -sf -o /dev/null -w "%{http_code}" \
    "$OLLAMA_URL/api/tags" \
    --connect-timeout 3 2>/dev/null || echo "000")
  if [[ "$HTTP" == "200" ]]; then
    ok "OLLAMA_URL (responde)" "${#OLLAMA_URL}"
  else
    fail "OLLAMA_URL (no responde HTTP $HTTP)"
    ((MISSING++)) || true
  fi
fi

echo ""
if [[ $MISSING -eq 0 ]]; then
  echo "[check-tokens] ✅ Todos los tokens OK"
else
  echo "[check-tokens] ❌ $MISSING tokens faltantes"
  exit 1
fi
