#!/usr/bin/env bash
# Peskids: combined readiness for Twenty CRM + optional wacrm inbox.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DRY_RUN=false
EXPECT_WACRM=false

usage() {
  cat <<'EOF'
Usage: ./scripts/peskids/wacrm-twenty-hybrid-smoke.sh [--dry-run] [--expect-wacrm]

Runs:
  1. twenty-crm-smoke.sh --tenant peskids
  2. wacrm-smoke.sh --slug peskids (skip if WACRM_PESKIDS_ENABLED not true)

Use --expect-wacrm to fail if wacrm is enabled in env but health check fails.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true ;;
    --expect-wacrm) EXPECT_WACRM=true ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
  shift
done

twenty_args=(--tenant peskids)
[[ "$DRY_RUN" == true ]] && twenty_args+=(--dry-run)

echo "=== Peskids hybrid smoke: Twenty ==="
"${ROOT}/scripts/tenants/twenty-crm-smoke.sh" "${twenty_args[@]}"
echo ""

echo "=== Peskids hybrid smoke: wacrm ==="
wacrm_args=(--slug peskids)
[[ "$DRY_RUN" == true ]] && wacrm_args+=(--dry-run)

enabled="${WACRM_PESKIDS_ENABLED:-false}"
if [[ "$enabled" == "true" || "$enabled" == "1" ]]; then
  if ! "${ROOT}/scripts/tenants/wacrm-smoke.sh" "${wacrm_args[@]}"; then
    echo "FAIL: wacrm enabled but smoke failed" >&2
    exit 1
  fi
elif [[ "$EXPECT_WACRM" == true ]]; then
  echo "FAIL: --expect-wacrm but WACRM_PESKIDS_ENABLED is not true" >&2
  exit 1
else
  "${ROOT}/scripts/tenants/wacrm-smoke.sh" "${wacrm_args[@]}" || true
  echo "SKIP: wacrm not enabled (expected until cutover)"
fi

echo ""
echo "OK: Peskids hybrid smoke complete"
echo "Doc: docs/tenants/peskids/WACRM-TWENTY-CUTOVER.md"
