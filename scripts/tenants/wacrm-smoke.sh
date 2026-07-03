#!/usr/bin/env bash
# Health check for wacrm sidecar when tenant flag + URL are configured.
set -euo pipefail

SLUG=""
DRY_RUN=false

usage() {
  cat <<'EOF'
Usage: ./scripts/tenants/wacrm-smoke.sh --slug <tenant-slug> [--dry-run]

Reads WACRM_{PREFIX}_SERVER_URL and WACRM_{PREFIX}_ENABLED from env (Doppler).
If disabled or URL missing: exit 0 with skip message (bootstrap phase).
If enabled: GET {SERVER_URL}/api/health or / (200 expected).
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --slug)
      shift
      SLUG="${1:-}"
      ;;
    --dry-run) DRY_RUN=true ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
  shift
done

[[ -n "$SLUG" ]] || { echo "Missing --slug" >&2; exit 1; }

ENV_PREFIX="$(echo "$SLUG" | tr '[:lower:]-' '[:upper:]_')"
if [[ "$SLUG" == "intcloudsysops" ]]; then
  ENV_PREFIX="INTCLOUDSYSOPS"
fi

ENABLED_VAR="WACRM_${ENV_PREFIX}_ENABLED"
URL_VAR="WACRM_${ENV_PREFIX}_SERVER_URL"
SYNC_VAR="WACRM_${ENV_PREFIX}_SYNC_TWENTY"

enabled="${!ENABLED_VAR:-false}"
server_url="${!URL_VAR:-}"
sync_mode="${!SYNC_VAR:-notes-only}"

echo "wacrm smoke slug=${SLUG} enabled=${enabled} sync=${sync_mode}"

if [[ "$enabled" != "true" && "$enabled" != "1" ]]; then
  echo "SKIP: ${ENABLED_VAR} not true (expected until cutover)"
  exit 0
fi

if [[ -z "$server_url" ]]; then
  echo "FAIL: ${ENABLED_VAR}=true but ${URL_VAR} empty" >&2
  exit 1
fi

base="${server_url%/}"
for path in /api/health /health /; do
  url="${base}${path}"
  if [[ "$DRY_RUN" == true ]]; then
    echo "DRY RUN: curl -sfk --max-time 10 $url"
    exit 0
  fi
  if curl -sfk --max-time 10 "$url" >/dev/null; then
    echo "OK: $url"
    exit 0
  fi
done

echo "FAIL: no health endpoint responded at ${base}" >&2
exit 1
