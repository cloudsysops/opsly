#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${TWITCH_ENV_FILE:-$ROOT/runtime/twitch.env}"
PROJECT="${DOPPLER_PROJECT:-ops-intcloudsysops}"
CONFIG="${DOPPLER_CONFIG:-twitch}"
DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1
export PATH="${HOME}/.npm-global/bin:${PATH}"

command -v doppler >/dev/null || { echo "ERROR: doppler CLI missing" >&2; exit 1; }
doppler me >/dev/null 2>&1 || { echo "ERROR: run doppler login" >&2; exit 1; }
[[ -f "$ENV_FILE" ]] || { echo "ERROR: missing $ENV_FILE" >&2; exit 1; }

echo "Migrating NAMES from $ENV_FILE -> $PROJECT/$CONFIG (values never printed)"
if [[ "$DRY_RUN" -eq 0 ]]; then
  doppler configs create "$CONFIG" --project "$PROJECT" --env "${DOPPLER_ENVIRONMENT:-dev}" >/dev/null 2>&1 || true
fi

uploaded=0
skipped=0
tmp="$(mktemp)"
chmod 600 "$tmp"
cleanup() { rm -f "$tmp"; }
trap cleanup EXIT

while IFS= read -r line || [[ -n "$line" ]]; do
  [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
  [[ "$line" != *"="* ]] && continue
  key="${line%%=*}"
  key="${key//[[:space:]]/}"
  val="${line#*=}"
  val="${val%\"}"; val="${val#\"}"
  val="${val%\'}"; val="${val#\'}"
  if [[ -z "$key" || -z "$val" ]]; then
    skipped=$((skipped + 1))
    echo "skip empty: $key"
    continue
  fi
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[dry-run] would set $key"
  else
    printf '%s' "$val" > "$tmp"
    # Pass via file redirect to reduce shell history leakage; still brief argv for key name only
    doppler secrets set "$key" --project "$PROJECT" --config "$CONFIG" < "$tmp" >/dev/null
    echo "set $key"
  fi
  uploaded=$((uploaded + 1))
done < "$ENV_FILE"

echo "DONE uploaded=$uploaded skipped_empty=$skipped"
if [[ "$DRY_RUN" -eq 0 ]]; then
  echo "Names in Doppler:"
  doppler secrets --only-names --project "$PROJECT" --config "$CONFIG"
  echo "After verify, delete plaintext: rm -f '$ENV_FILE'"
fi
