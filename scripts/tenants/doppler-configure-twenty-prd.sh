#!/usr/bin/env bash
# Idempotent Twenty CRM flags in Doppler (Peskids + ICSO). Never prints secret values.
set -euo pipefail

PROJECT="${DOPPLER_PROJECT:-ops-intcloudsysops}"
CONFIG="${DOPPLER_CONFIG:-prd}"
DRY_RUN=false
FORCE=false
TENANT="both"

usage() {
  cat <<'EOF'
Usage: ./scripts/tenants/doppler-configure-twenty-prd.sh [--dry-run] [--force] [--tenant peskids|icso|both]

Sets Twenty CRM feature flags:
  PESKIDS_TWENTY_ENABLED=true          (when TWENTY_API_KEY + TWENTY_API_URL exist, or --force)
  INTCLOUDSYSOPS_TWENTY_ENABLED=true   (when TWENTY_INTCLOUDSYSOPS_API_* exist, or --force)

Does NOT generate TWENTY_APP_SECRET / stack secrets — use:
  ./scripts/tenants/generate-twenty-secrets.sh [--execute]
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true ;;
    --force) FORCE=true ;;
    --tenant)
      shift
      TENANT="${1:-both}"
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

secret_exists() {
  doppler secrets get "$1" --project "$PROJECT" --config "$CONFIG" --plain >/dev/null 2>&1
}

get_plain() {
  doppler secrets get "$1" --project "$PROJECT" --config "$CONFIG" --plain 2>/dev/null || true
}

set_flag() {
  local name="$1"
  local value="$2"
  if secret_exists "$name" && [[ "$FORCE" != true ]]; then
    echo "  ok   $name (already set)"
    return 0
  fi
  if [[ "$DRY_RUN" == true ]]; then
    echo "  plan set $name=$value"
    return 0
  fi
  doppler secrets set "$name=$value" --project "$PROJECT" --config "$CONFIG" >/dev/null
  echo "  set  $name=$value"
}

echo "Twenty CRM flags → Doppler ${PROJECT}/${CONFIG} (tenant=${TENANT})"
echo "dry_run=${DRY_RUN} force=${FORCE}"
echo ""

configure_peskids() {
  echo "Peskids:"
  local api_key api_url
  api_key="$(get_plain TWENTY_API_KEY)"
  api_url="$(get_plain TWENTY_API_URL)"
  if [[ -n "$api_key" && -n "$api_url" ]] || [[ "$FORCE" == true ]]; then
    set_flag PESKIDS_TWENTY_ENABLED "true"
  else
    echo "  skip PESKIDS_TWENTY_ENABLED (set TWENTY_API_URL + TWENTY_API_KEY or use --force)"
  fi
}

configure_icso() {
  echo "ICSO (intcloudsysops):"
  local api_key api_url
  api_key="$(get_plain TWENTY_INTCLOUDSYSOPS_API_KEY)"
  api_url="$(get_plain TWENTY_INTCLOUDSYSOPS_API_URL)"
  if [[ -n "$api_key" && -n "$api_url" ]] || [[ "$FORCE" == true ]]; then
    set_flag INTCLOUDSYSOPS_TWENTY_ENABLED "true"
  else
    echo "  skip INTCLOUDSYSOPS_TWENTY_ENABLED (set TWENTY_INTCLOUDSYSOPS_API_* or use --force)"
  fi
}

case "$TENANT" in
  peskids) configure_peskids ;;
  icso) configure_icso ;;
  both)
    configure_peskids
    echo ""
    configure_icso
    ;;
  *)
    echo "Invalid --tenant: $TENANT" >&2
    exit 1
    ;;
esac

echo ""
echo "Next:"
echo "  ./scripts/tenants/verify-twenty-stack.sh"
echo "  TWENTY_SMOKE_EXPECT_IDS=true ./scripts/tenants/twenty-crm-smoke.sh --tenant peskids"
