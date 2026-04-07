#!/usr/bin/env bash
# Comprueba longitud de secretos en Doppler prd sin imprimir valores.
set -euo pipefail

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

if $DRY_RUN; then
  echo "dry-run: comprobaría ANTHROPIC_API_KEY GITHUB_TOKEN_N8N GOOGLE_DRIVE_TOKEN RESEND_API_KEY DISCORD_WEBHOOK_URL PLATFORM_ADMIN_TOKEN en Doppler prd (solo longitudes)."
  exit 0
fi

if ! command -v doppler >/dev/null 2>&1; then
  echo "❌ doppler CLI no está en PATH; instálalo o usa esta máquina con Doppler configurado."
  exit 1
fi

for VAR in ANTHROPIC_API_KEY GITHUB_TOKEN_N8N GOOGLE_DRIVE_TOKEN RESEND_API_KEY \
  DISCORD_WEBHOOK_URL PLATFORM_ADMIN_TOKEN; do
  VAL="$(doppler secrets get "$VAR" --project ops-intcloudsysops --config prd --plain 2>/dev/null || echo "")"
  LEN=${#VAL}
  if [[ $LEN -gt 20 ]]; then
    echo "✅ $VAR ($LEN chars)"
  else
    echo "❌ $VAR — falta o placeholder"
  fi
done
