#!/usr/bin/env bash
# wacrm hybrid bootstrap (flags → setup hints → smoke).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DRY_RUN=false
EXECUTE_DOPPLER=false
SLUG="peskids"

usage() {
  cat <<'EOF'
Usage: ./scripts/tenants/bootstrap-wacrm.sh [--slug peskids|intcloudsysops] [--dry-run] [--execute-doppler]

Phases:
  1. doppler-configure-wacrm-prd.sh (defaults OFF)
  2. setup-wacrm-tenant.sh (sidecar hints)
  3. wacrm-smoke.sh

Prerequisite: Twenty stable for tenant (bootstrap-twenty.sh + twenty-crm-smoke.sh).
Manual: Meta Business + wacrm admin; then WACRM_*_ENABLED=true after smoke.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --slug)
      shift
      SLUG="${1:-peskids}"
      ;;
    --dry-run) DRY_RUN=true ;;
    --execute-doppler) EXECUTE_DOPPLER=true; DRY_RUN=false ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
  shift
done

map_doppler_tenant() {
  case "$SLUG" in
    peskids) echo "peskids" ;;
    intcloudsysops) echo "icso" ;;
    *) echo "both" ;;
  esac
}
DOPPLER_TENANT="$(map_doppler_tenant)"

run() {
  if [[ "$DRY_RUN" == true ]]; then
    echo "DRY RUN: $*"
  else
    "$@"
  fi
}

echo "=== wacrm bootstrap (slug=${SLUG}) ==="
echo ""

echo "[1/3] Doppler wacrm flags (default disabled)"
doppler_args=(--tenant "$DOPPLER_TENANT")
[[ "$DRY_RUN" == true ]] && doppler_args+=(--dry-run)
if [[ "$EXECUTE_DOPPLER" == true ]]; then
  run "${ROOT}/scripts/tenants/doppler-configure-wacrm-prd.sh" "${doppler_args[@]}"
else
  echo "  plan ./scripts/tenants/doppler-configure-wacrm-prd.sh --tenant $DOPPLER_TENANT"
  [[ "$DRY_RUN" == true ]] && run "${ROOT}/scripts/tenants/doppler-configure-wacrm-prd.sh" "${doppler_args[@]}"
fi
echo ""

echo "[2/3] Sidecar setup hints"
setup_args=(--slug "$SLUG")
[[ "$DRY_RUN" == true ]] && setup_args+=(--dry-run)
run "${ROOT}/scripts/tenants/setup-wacrm-tenant.sh" "${setup_args[@]}"
echo ""

echo "[3/3] Smoke"
smoke_args=(--slug "$SLUG")
[[ "$DRY_RUN" == true ]] && smoke_args+=(--dry-run)
run "${ROOT}/scripts/tenants/wacrm-smoke.sh" "${smoke_args[@]}" || true
echo ""
echo "Contract: docs/blueprints/WACRM-TWENTY-HYBRID-CONTRACT.md"
