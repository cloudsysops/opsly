#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${WORKER_ENV_FILE:-$ROOT/.env.worker}"
PROJECT="${DOPPLER_PROJECT:-ops-intcloudsysops}"
CONFIG="${DOPPLER_CONFIG:-dev_content_studio}"
DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1
export PATH="${HOME}/.local/bin:${HOME}/.npm-global/bin:${PATH}"
DP=(doppler --no-check-version)
KEYS=(OBS_WEBSOCKET_PASSWORD OPSLY_CLI_AGENT_TOKEN)

"${DP[@]}" me >/dev/null 2>&1 || { echo "ERROR: run: doppler --no-check-version login" >&2; exit 1; }
[[ -f "$ENV_FILE" ]] || { echo "missing $ENV_FILE" >&2; exit 1; }

if [[ "$DRY_RUN" -eq 0 ]]; then
  "${DP[@]}" configs create "$CONFIG" --project "$PROJECT" --env "${DOPPLER_ENVIRONMENT:-dev}" >/dev/null 2>&1 || true
fi

tmp="$(mktemp)"; chmod 600 "$tmp"; trap 'rm -f "$tmp"' EXIT
for key in "${KEYS[@]}"; do
  val="$(grep -E "^${key}=" "$ENV_FILE" | head -1 | cut -d= -f2- || true)"
  if [[ -z "$val" ]]; then echo "skip missing: $key"; continue; fi
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[dry-run] would set $key"
  else
    printf '%s' "$val" > "$tmp"
    "${DP[@]}" secrets set "$key" --project "$PROJECT" --config "$CONFIG" < "$tmp" >/dev/null
    echo "set $key"
  fi
done
echo "DONE (names only):"
"${DP[@]}" secrets --only-names --project "$PROJECT" --config "$CONFIG" 2>/dev/null || true
