#!/usr/bin/env bash
# Idempotent GHL legacy disable via Doppler flags (does not delete GHL data or webhooks).
set -euo pipefail

PROJECT="${DOPPLER_PROJECT:-ops-intcloudsysops}"
CONFIG="${DOPPLER_CONFIG:-prd}"
DRY_RUN=false
TENANT="both"

usage() {
  cat <<'EOF'
Usage: ./scripts/tenants/ghl-disable-legacy.sh [--dry-run] [--tenant peskids|icso|both]

Sets GHL feature flags to false (Twenty remains primary when configured):
  PESKIDS_GHL_ENABLED=false
  INTCLOUDSYSOPS_GHL_ENABLED=false

Does NOT remove GHL webhooks, location IDs, or @intcloudsysops/services/gohighlevel code.
Rollback: set flag true in Doppler + redeploy app (see TWENTY-CRM-CUTOVER-CHECKLIST.md).
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true ;;
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

set_flag() {
  local name="$1"
  local value="$2"
  if [[ "$DRY_RUN" == true ]]; then
    echo "  plan set $name=$value"
    return 0
  fi
  doppler secrets set "$name=$value" --project "$PROJECT" --config "$CONFIG" >/dev/null
  echo "  set  $name=$value"
}

echo "GHL legacy disable → Doppler ${PROJECT}/${CONFIG} (tenant=${TENANT})"
echo ""

case "$TENANT" in
  peskids)
    echo "Peskids:"
    set_flag PESKIDS_GHL_ENABLED "false"
    ;;
  icso)
    echo "ICSO (intcloudsysops):"
    set_flag INTCLOUDSYSOPS_GHL_ENABLED "false"
    ;;
  both)
    echo "Peskids:"
    set_flag PESKIDS_GHL_ENABLED "false"
    echo ""
    echo "ICSO:"
    set_flag INTCLOUDSYSOPS_GHL_ENABLED "false"
    ;;
  *)
    echo "Invalid --tenant: $TENANT" >&2
    exit 1
    ;;
esac

echo ""
echo "Next:"
echo "  ./scripts/vps-bootstrap.sh   # VPS: propagate .env"
echo "  Redeploy peskids + icso apps"
echo "  ./scripts/tenants/twenty-crm-smoke.sh --tenant peskids"
