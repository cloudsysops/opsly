#!/usr/bin/env bash
# Keep Tailscale *server* node keys from expiring. Phones only warn.
# Default: --dry-run. Does not print API keys or rotate Doppler/GitHub secrets.
#
# Usage:
#   ./scripts/ops/ensure-tailscale-key-hygiene.sh
#   ./scripts/ops/ensure-tailscale-key-hygiene.sh --apply --notify
#   doppler run --project ops-intcloudsysops --config prd -- \
#     ./scripts/ops/ensure-tailscale-key-hygiene.sh --apply --notify
set -euo pipefail

DRY_RUN=1
NOTIFY=0
TAILNET="${TAILSCALE_TAILNET:--}"
API_KEY="${TAILSCALE_API_KEY:-${TS_API_KEY:-}}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
CONFIG="${TAILSCALE_KEY_HYGIENE_CONFIG:-${ROOT}/config/tailscale-key-hygiene.json}"
PLANNER="${SCRIPT_DIR}/tailscale_key_hygiene.py"

usage() {
  cat <<'EOF'
Usage: ensure-tailscale-key-hygiene.sh [--dry-run|--apply] [--notify] [--help]

Lists Tailscale devices and disables node-key expiry on Opsly servers
(pc-gamer, VPS, workers). Personal devices only generate a warning.

Requires TAILSCALE_API_KEY (or Doppler prd). Default is --dry-run.
Never prints secret values.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --apply) DRY_RUN=0; shift ;;
    --notify) NOTIFY=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; usage >&2; exit 2 ;;
  esac
done

load_api_key() {
  if [[ -n "${API_KEY}" ]]; then
    return 0
  fi
  if ! command -v doppler >/dev/null 2>&1; then
    echo "Missing TAILSCALE_API_KEY (or TS_API_KEY)." >&2
    return 1
  fi
  API_KEY="$(
    doppler secrets get TAILSCALE_API_KEY \
      --project ops-intcloudsysops --config prd --plain 2>/dev/null || true
  )"
  if [[ -z "${API_KEY}" ]]; then
    echo "Missing TAILSCALE_API_KEY in env and Doppler prd." >&2
    return 1
  fi
}

require_cmds() {
  command -v jq >/dev/null 2>&1 || { echo "jq is required" >&2; exit 1; }
  command -v curl >/dev/null 2>&1 || { echo "curl is required" >&2; exit 1; }
  command -v python3 >/dev/null 2>&1 || { echo "python3 is required" >&2; exit 1; }
}

fetch_devices() {
  curl -fsS "https://api.tailscale.com/api/v2/tailnet/${TAILNET}/devices" \
    -u "${API_KEY}:"
}

disable_expiry() {
  local device_id="${1:?}"
  curl -fsS -X POST "https://api.tailscale.com/api/v2/device/${device_id}/key" \
    -u "${API_KEY}:" \
    -H "Content-Type: application/json" \
    -d '{"keyExpiryDisabled":true}' \
    >/dev/null
}

load_discord_webhook() {
  if [[ -n "${DISCORD_WEBHOOK_URL:-}" ]]; then
    return 0
  fi
  if ! command -v doppler >/dev/null 2>&1; then
    return 0
  fi
  DISCORD_WEBHOOK_URL="$(
    doppler secrets get DISCORD_WEBHOOK_URL \
      --project ops-intcloudsysops --config prd --plain 2>/dev/null || true
  )"
  export DISCORD_WEBHOOK_URL
}

notify() {
  local title="$1"
  local message="$2"
  local kind="$3"
  if [[ "${NOTIFY}" -ne 1 ]]; then
    return 0
  fi
  if [[ ! -x "${ROOT}/scripts/notify-discord.sh" ]]; then
    return 0
  fi
  load_discord_webhook
  "${ROOT}/scripts/notify-discord.sh" "${title}" "${message}" "${kind}" >/dev/null || true
}

summarize() {
  local plan_json="$1"
  jq -r '
    "devices=\(.device_count) disable=\(.disable_count) warn=\(.warn_count) ok=\(.ok_count) skip=\(.skip_count)",
    (.actions[] | select(.action=="disable_expiry") | "DISABLE \(.name) expires=\(.expires_at // "n/a") days=\(.days_remaining // "n/a")"),
    (.actions[] | select(.action=="warn") | "WARN \(.name) expires=\(.expires_at // "n/a") days=\(.days_remaining // "n/a")")
  ' <<<"${plan_json}"
}

apply_disables() {
  local plan_json="$1"
  local applied=0
  local failed=0
  local device_id name
  while IFS=$'\t' read -r device_id name; do
    [[ -z "${device_id}" ]] && continue
    if [[ "${DRY_RUN}" -eq 1 ]]; then
      echo "dry-run would disable expiry: ${name}"
      continue
    fi
    if disable_expiry "${device_id}"; then
      echo "disabled expiry: ${name}"
      applied=$((applied + 1))
    else
      echo "FAILED disable expiry: ${name}" >&2
      failed=$((failed + 1))
    fi
  done < <(
    jq -r '.actions[] | select(.action=="disable_expiry") | [.id, .name] | @tsv' \
      <<<"${plan_json}"
  )
  echo "applied=${applied} failed=${failed} dry_run=${DRY_RUN}"
  if [[ "${failed}" -gt 0 ]]; then
    return 1
  fi
  return 0
}

main() {
  require_cmds
  load_api_key
  [[ -f "${CONFIG}" ]] || { echo "missing config ${CONFIG}" >&2; exit 1; }
  [[ -f "${PLANNER}" ]] || { echo "missing planner ${PLANNER}" >&2; exit 1; }

  echo "tailnet=${TAILNET} dry_run=${DRY_RUN} notify=${NOTIFY}"
  local devices_json plan_json summary
  if ! devices_json="$(fetch_devices)"; then
    notify "🔑 Tailscale key hygiene FAILED" "devices API failed (no secret printed)" "error"
    exit 2
  fi
  plan_json="$(python3 "${PLANNER}" --config "${CONFIG}" --devices-json - <<<"${devices_json}")"
  summary="$(summarize "${plan_json}")"
  echo "${summary}"

  if ! apply_disables "${plan_json}"; then
    notify "🔑 Tailscale key hygiene FAILED" "${summary}" "error"
    exit 2
  fi

  local disable_count warn_count
  disable_count="$(jq -r '.disable_count' <<<"${plan_json}")"
  warn_count="$(jq -r '.warn_count' <<<"${plan_json}")"

  if [[ "${warn_count}" -gt 0 || "${disable_count}" -gt 0 ]]; then
    local kind="warning"
    [[ "${DRY_RUN}" -eq 0 && "${disable_count}" -gt 0 ]] && kind="success"
    notify "🔑 Tailscale key hygiene" "${summary}" "${kind}"
  fi
  exit 0
}

main "$@"
