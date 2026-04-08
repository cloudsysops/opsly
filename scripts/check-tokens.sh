#!/usr/bin/env bash
# Comprueba longitud de secretos en Doppler prd sin imprimir valores.
set -euo pipefail

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

if $DRY_RUN; then
  echo "dry-run: comprobaría ANTHROPIC_API_KEY OPENROUTER_API_KEY OPENAI_API_KEY OLLAMA_URL GITHUB_TOKEN_N8N GOOGLE_DRIVE_TOKEN RESEND_API_KEY DISCORD_WEBHOOK_URL PLATFORM_ADMIN_TOKEN en Doppler prd (solo longitudes / Ollama reachability)."
  exit 0
fi

if ! command -v doppler >/dev/null 2>&1; then
  echo "❌ doppler CLI no está en PATH; instálalo o usa esta máquina con Doppler configurado."
  exit 1
fi

for VAR in ANTHROPIC_API_KEY OPENROUTER_API_KEY OPENAI_API_KEY GITHUB_TOKEN_N8N GOOGLE_DRIVE_TOKEN RESEND_API_KEY \
  DISCORD_WEBHOOK_URL PLATFORM_ADMIN_TOKEN; do
  VAL="$(doppler secrets get "$VAR" --project ops-intcloudsysops --config prd --plain 2>/dev/null || echo "")"
  LEN=${#VAL}
  if [[ $LEN -gt 20 ]]; then
    echo "✅ $VAR ($LEN chars)"
  else
    echo "❌ $VAR — falta o placeholder"
  fi
done

OLLAMA_URL_VAL="$(doppler secrets get OLLAMA_URL --project ops-intcloudsysops --config prd --plain 2>/dev/null || echo "")"
if [[ -z "$OLLAMA_URL_VAL" ]]; then
  OLLAMA_URL_VAL="http://localhost:11434"
fi
OLLAMA_BASE="${OLLAMA_URL_VAL%/}"
HTTP_CODE="$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "${OLLAMA_BASE}/api/tags" 2>/dev/null || echo "000")"
if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "401" ]]; then
  echo "✅ OLLAMA_URL (${OLLAMA_BASE}/api/tags → HTTP ${HTTP_CODE})"
else
  echo "❌ OLLAMA_URL — no responde ${OLLAMA_BASE}/api/tags (HTTP ${HTTP_CODE}; opcional si no usas Ollama en prd)"
fi
