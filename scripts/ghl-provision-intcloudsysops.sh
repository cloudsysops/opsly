#!/usr/bin/env bash
# Provision Intcloudsysops agency GHL location from docs/examples/intake/intcloudsysops.json
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PROJECT="${DOPPLER_PROJECT:-ops-intcloudsysops}"
CONFIG="${DOPPLER_CONFIG:-prd}"
MANIFEST="${GHL_MANIFEST:-docs/examples/intake/intcloudsysops.json}"

usage() {
  cat <<EOF
Usage: $(basename "$0") [--dry-run|--execute] [--location ID]

  --dry-run   Plan only (default)
  --execute   Create tags, custom fields, calendars via GHL API
  --location  Override GOHIGHLEVEL_LOCATION_ID

Requires Doppler secrets: GOHIGHLEVEL_API_KEY, GOHIGHLEVEL_LOCATION_ID
EOF
}

MODE_ARGS=(--dry-run)
LOCATION_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      MODE_ARGS=(--dry-run)
      shift
      ;;
    --execute)
      MODE_ARGS=(--execute)
      shift
      ;;
    --location)
      LOCATION_ARGS=(--location "$2")
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

command -v doppler >/dev/null 2>&1 || {
  echo "doppler CLI required" >&2
  exit 1
}

doppler run --project "$PROJECT" --config "$CONFIG" -- \
  npx tsx scripts/ghl-provision.ts \
  --manifest "$MANIFEST" \
  --tenant intcloudsysops \
  "${MODE_ARGS[@]}" \
  ${LOCATION_ARGS+"${LOCATION_ARGS[@]}"}
