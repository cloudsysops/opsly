#!/usr/bin/env bash
# Rechaza secretos maestros / de alto privilegio en .env.worker del nodo efímero.
# Exit 0 = limpio; 1 = hallazgo (no arrancar worker).
#
# Usage:
#   ./scripts/ops/assert-ephemeral-worker-env.sh
#   ./scripts/ops/assert-ephemeral-worker-env.sh --env-file /path/.env.worker
#
set -euo pipefail

ENV_FILE=""
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      ENV_FILE="${2:-}"
      shift 2
      ;;
    -h|--help)
      sed -n '2,14p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 1
      ;;
  esac
done

ENV_FILE="${ENV_FILE:-$ROOT/.env.worker}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "[ephemeral-env] missing $ENV_FILE" >&2
  exit 1
fi

# Nombres prohibidos en un PC prestado (mínimo privilegio).
FORBIDDEN_KEYS=(
  DOPPLER_TOKEN
  DOPPLER_SERVICE_TOKEN
  AWS_SECRET_ACCESS_KEY
  AWS_ACCESS_KEY_ID
  GOOGLE_APPLICATION_CREDENTIALS
  GCP_SA_KEY
  SUPABASE_SERVICE_ROLE_KEY
  STRIPE_SECRET_KEY
  STRIPE_LIVE_SECRET_KEY
  GHCR_TOKEN
  GITHUB_TOKEN
  PLATFORM_ADMIN_TOKEN
  SSH_PRIVATE_KEY
  TAILSCALE_AUTHKEY
)

found=0
while IFS= read -r line; do
  [[ "$line" =~ ^[[:space:]]*# ]] && continue
  [[ "$line" != *=* ]] && continue
  key="${line%%=*}"
  key="${key// /}"
  for bad in "${FORBIDDEN_KEYS[@]}"; do
    if [[ "$key" == "$bad" ]]; then
      echo "[ephemeral-env] FORBIDDEN key present: $key" >&2
      found=1
    fi
  done
done < "$ENV_FILE"

# REDIS_URL debe apuntar al VPS Tailscale, no a hostname docker local
if grep -qE '^REDIS_URL=.*@redis:' "$ENV_FILE" || grep -qE '^REDIS_URL=redis://redis' "$ENV_FILE"; then
  echo "[ephemeral-env] REDIS_URL looks like Docker hostname 'redis' — use 100.120.151.91" >&2
  found=1
fi

if grep -qE '^OPSLY_ORCHESTRATOR_ROLE=(control|full)' "$ENV_FILE"; then
  echo "[ephemeral-env] ROLE must be worker on ephemeral node" >&2
  found=1
fi

if [[ "$found" -ne 0 ]]; then
  exit 1
fi

echo "[ephemeral-env] OK ($ENV_FILE)"
