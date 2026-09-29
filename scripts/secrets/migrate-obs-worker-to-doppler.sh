#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${WORKER_ENV_FILE:-$ROOT/.env.worker}"
PROJECT="${DOPPLER_PROJECT:-ops-intcloudsysops}"
CONFIG="${DOPPLER_CONFIG:-content-studio}"
DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1
export PATH="${HOME}/.npm-global/bin:${PATH}"

KEYS=(OBS_WEBSOCKET_PASSWORD OPSLY_CLI_AGENT_TOKEN)

if ! doppler me >/dev/null 2>&1; then
  echo "ERROR: doppler login required" >&2
  exit 1
fi
[[ -f "$ENV_FILE" ]] || { echo "missing $ENV_FILE" >&2; exit 1; }

if [[ "$DRY_RUN" -eq 0 ]]; then
  doppler configs create "$CONFIG" --project "$PROJECT" --env "${DOPPLER_ENVIRONMENT:-dev}" 2>/dev/null || true
fi

for key in "${KEYS[@]}"; do
  # extract without printing
  val="$(grep -E "^${key}=" "$ENV_FILE" | head -1 | cut -d= -f2- || true)"
  if [[ -z "$val" ]]; then
    echo "skip missing: $key"
    continue
  fi
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[dry-run] would set $key"
  else
    doppler secrets set "${key}=${val}" --project "$PROJECT" --config "$CONFIG" >/dev/null
    echo "set $key"
  fi
done
echo "DONE (names only):"
doppler secrets --only-names --project "$PROJECT" --config "$CONFIG" 2>/dev/null || true
