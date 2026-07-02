#!/usr/bin/env bash
# Idempotent wacrm feature flags in Doppler (disabled by default). Never prints secrets.
set -euo pipefail

PROJECT="${DOPPLER_PROJECT:-ops-intcloudsysops}"
CONFIG="${DOPPLER_CONFIG:-prd}"
DRY_RUN=false
FORCE=false
TENANT="both"

usage() {
  cat <<'EOF'
Usage: ./scripts/tenants/doppler-configure-wacrm-prd.sh [--dry-run] [--force] [--tenant peskids|icso|both]

Sets wacrm hybrid flags (OFF by default until smoke passes):
  WACRM_PESKIDS_ENABLED=false
  WACRM_PESKIDS_SYNC_TWENTY=notes-only
  WACRM_INTCLOUDSYSOPS_ENABLED=false
  WACRM_INTCLOUDSYSOPS_SYNC_TWENTY=notes-only

Optional (set manually or via setup-wacrm-tenant.sh hints):
  WACRM_{PREFIX}_SERVER_URL
  WACRM_{PREFIX}_WEBHOOK_SECRET

Contract: docs/blueprints/WACRM-TWENTY-HYBRID-CONTRACT.md
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

echo "wacrm flags → Doppler ${PROJECT}/${CONFIG} (tenant=${TENANT})"
echo "dry_run=${DRY_RUN} force=${FORCE}"
echo ""

configure_peskids() {
  echo "Peskids:"
  set_flag WACRM_PESKIDS_ENABLED "false"
  set_flag WACRM_PESKIDS_SYNC_TWENTY "notes-only"
}

configure_icso() {
  echo "ICSO (intcloudsysops slug):"
  set_flag WACRM_INTCLOUDSYSOPS_ENABLED "false"
  set_flag WACRM_INTCLOUDSYSOPS_SYNC_TWENTY "notes-only"
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
    echo "Invalid --tenant: $TENANT (use peskids|icso|both)" >&2
    exit 1
    ;;
esac

echo ""
echo "Next: deploy sidecar → set SERVER_URL + WEBHOOK_SECRET → wacrm-smoke.sh → WACRM_*_ENABLED=true"
