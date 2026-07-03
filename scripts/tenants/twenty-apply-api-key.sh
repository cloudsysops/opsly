#!/usr/bin/env bash
# Apply Twenty API key to Doppler after manual creation in Twenty UI (stdin, never argv).
set -euo pipefail

PROJECT="${DOPPLER_PROJECT:-ops-intcloudsysops}"
CONFIG="${DOPPLER_CONFIG:-prd}"
DRY_RUN=false
TENANT="peskids"
API_URL=""

usage() {
  cat <<'EOF'
Usage: ./scripts/tenants/twenty-apply-api-key.sh [--tenant peskids|icso] [--api-url URL] [--dry-run]

Reads API key from stdin (or TWENTY_API_KEY_INPUT env). Does not echo the key.

Examples:
  doppler secrets get TWENTY_SERVER_URL --plain -p ops-intcloudsysops -c prd | \
    read -r url; echo "paste-key" | ./scripts/tenants/twenty-apply-api-key.sh --api-url "$url"

  echo "$KEY" | ./scripts/tenants/twenty-apply-api-key.sh --tenant icso --api-url https://crm-intcloudsysops.op-sly.com
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true ;;
    --tenant)
      shift
      TENANT="${1:-peskids}"
      ;;
    --api-url)
      shift
      API_URL="${1:-}"
      ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
  shift
done

if ! command -v doppler >/dev/null 2>&1; then
  echo "doppler CLI not found" >&2
  exit 1
fi

if [[ -n "${TWENTY_API_KEY_INPUT:-}" ]]; then
  api_key="$TWENTY_API_KEY_INPUT"
else
  if [[ -t 0 ]]; then
    echo "Paste Twenty API key (hidden), then Enter:" >&2
    read -rs api_key
    echo >&2
  else
    read -rs api_key
  fi
fi

if [[ -z "${api_key// }" ]]; then
  echo "FAIL: empty API key" >&2
  exit 1
fi

if [[ "$TENANT" == "peskids" ]]; then
  key_var=TWENTY_API_KEY
  url_var=TWENTY_API_URL
  enabled_var=PESKIDS_TWENTY_ENABLED
elif [[ "$TENANT" == "icso" ]]; then
  key_var=TWENTY_INTCLOUDSYSOPS_API_KEY
  url_var=TWENTY_INTCLOUDSYSOPS_API_URL
  enabled_var=INTCLOUDSYSOPS_TWENTY_ENABLED
else
  echo "Invalid --tenant: $TENANT" >&2
  exit 1
fi

if [[ -z "$API_URL" ]]; then
  API_URL="$(doppler secrets get TWENTY_SERVER_URL --project "$PROJECT" --config "$CONFIG" --plain 2>/dev/null || true)"
fi
if [[ -z "$API_URL" ]]; then
  echo "FAIL: pass --api-url or set TWENTY_SERVER_URL in Doppler" >&2
  exit 1
fi
API_URL="${API_URL%/}"

if [[ "$DRY_RUN" == true ]]; then
  echo "DRY RUN: would set ${key_var}, ${url_var}=${API_URL}, ${enabled_var}=true"
  exit 0
fi

printf '%s' "$api_key" | doppler secrets set "$key_var" --project "$PROJECT" --config "$CONFIG" >/dev/null
doppler secrets set "${url_var}=${API_URL}" "${enabled_var}=true" --project "$PROJECT" --config "$CONFIG" >/dev/null
unset api_key

echo "set  ${key_var} (value hidden)"
echo "set  ${url_var}=${API_URL}"
echo "set  ${enabled_var}=true"
echo ""
echo "Run: ./scripts/tenants/doppler-configure-twenty-prd.sh --tenant ${TENANT}"
echo "Run: ./scripts/tenants/verify-twenty-stack.sh --probe-api"
